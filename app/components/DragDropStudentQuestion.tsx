import React, { useState, useEffect } from "react";

export interface DragDropStudentQuestionProps {
  question: any;
  studentAnswer: any;
  setStudentAnswer: (ans: any) => void;
  disabled?: boolean;
}

type DragDropItem = { id: string; text: string };

const DragDropStudentQuestion: React.FC<DragDropStudentQuestionProps> = ({
  question,
  studentAnswer,
  setStudentAnswer,
  disabled = false,
}) => {
  const [bank, setBank] = useState<DragDropItem[]>([]);
  const [userSections, setUserSections] = useState<
    { name: string; answers: DragDropItem[] }[]
  >([]);
  const [initialized, setInitialized] = useState(false);

  // Force re-initialization if the user navigates to a completely different question
  useEffect(() => {
    setInitialized(false);
  }, [question?.question]);

  // Initialize the drag-and-drop board
  useEffect(() => {
    if (initialized || !question || question.type !== "dragdrop") return;

    // Combine all valid answers from the teacher's original setup
    const allValidAnswers = [
      ...(question.answerBank || []),
      ...(question.sections || []).flatMap((s: any) => s.answers),
    ];

    if (studentAnswer && Array.isArray(studentAnswer)) {
      // SCENARIO 1: Restoring from a saved attempt (e.g., page reload)
      const restoredSections = studentAnswer.map((sec: any) => ({
        name: sec.name,
        answers: (sec.answers || []).map((text: string) => ({
          id: crypto.randomUUID(),
          text,
        })),
      }));
      setUserSections(restoredSections);

      // Calculate what is left in the bank by checking off placed items
      let remainingTexts = [...allValidAnswers];
      restoredSections.forEach((sec: any) => {
        sec.answers.forEach((ans: any) => {
          const idx = remainingTexts.indexOf(ans.text);
          if (idx !== -1) remainingTexts.splice(idx, 1);
        });
      });
      setBank(
        remainingTexts.map((text) => ({ id: crypto.randomUUID(), text })),
      );
    } else {
      // SCENARIO 2: Fresh start for this question
      const initialBank = allValidAnswers
        .map((text) => ({ id: crypto.randomUUID(), text }))
        .sort(() => Math.random() - 0.5); // Shuffle the bank randomly

      const initialSections = (question.sections || []).map((s: any) => ({
        name: s.name,
        answers: [],
      }));

      setBank(initialBank);
      setUserSections(initialSections);
    }

    setInitialized(true);
  }, [question, studentAnswer, initialized]);

  // Handle the drop event
  const handleDrop = (e: React.DragEvent, targetSectionName: string | null) => {
    e.preventDefault();
    if (disabled) return;

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;

    // 1. Find the dragged item
    let draggedItem = bank.find((a) => a.id === draggedId);
    if (!draggedItem) {
      for (const sec of userSections) {
        const found = sec.answers.find((a) => a.id === draggedId);
        if (found) draggedItem = found;
      }
    }
    if (!draggedItem) return;

    // 2. Remove from its current location
    const nextBank = bank.filter((a) => a.id !== draggedId);
    let nextSections = userSections.map((sec) => ({
      ...sec,
      answers: sec.answers.filter((a) => a.id !== draggedId),
    }));

    // 3. Add to the new target location
    if (targetSectionName === null) {
      nextBank.push(draggedItem);
    } else {
      nextSections = nextSections.map((sec) => {
        if (sec.name === targetSectionName) {
          return { ...sec, answers: [...sec.answers, draggedItem!] };
        }
        return sec;
      });
    }

    setBank(nextBank);
    setUserSections(nextSections);

    // 4. Update the parent component with the payload expected by the Convex DB schema
    const payload = nextSections.map((sec) => ({
      name: sec.name,
      answers: sec.answers.map((a) => a.text),
    }));

    setStudentAnswer(payload);
  };

  // Helper to determine if a placed item is correct (used for visual feedback)
  const checkIsCorrect = (sectionName: string, itemText: string) => {
    const correctSection = question.sections?.find(
      (s: any) => s.name === sectionName,
    );
    if (!correctSection) return false;
    return correctSection.answers.includes(itemText);
  };

  return (
    <div className="space-y-4">
      {/* ANSWER BANK ZONE */}
      <div
        className={`min-h-[80px] p-4 border-2 border-dashed rounded-lg flex flex-wrap gap-2 transition-colors ${
          disabled
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-50 border-indigo-200"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => handleDrop(e, null)}
      >
        {bank.length === 0 && (
          <span className="text-slate-400 italic text-sm my-auto mx-auto flex items-center">
            {disabled ? "Bank empty" : "Drag answers to the sections below"}
          </span>
        )}
        {bank.map((item) => (
          <div
            key={item.id}
            draggable={!disabled}
            onDragStart={(e) => {
              if (!disabled) e.dataTransfer.setData("text/plain", item.id);
            }}
            className={`px-3 py-1.5 rounded-md shadow-sm text-sm font-medium transition-colors ${
              disabled
                ? "bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white border border-slate-200 text-slate-700 cursor-move hover:border-indigo-400 hover:shadow"
            }`}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* SECTIONS / DROP ZONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userSections.map((section) => (
          <div
            key={section.name}
            className={`p-4 border shadow-sm rounded-lg min-h-[120px] flex flex-col transition-colors ${
              disabled
                ? "bg-gray-50 border-gray-200"
                : "bg-white border-slate-200"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => handleDrop(e, section.name)}
          >
            <h3 className="font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">
              {section.name}
            </h3>
            <div className="flex-1 flex flex-col gap-2">
              {section.answers.map((item) => {
                const isCorrect = checkIsCorrect(section.name, item.text);

                // Base styling for active dragging
                let itemStyles =
                  "bg-indigo-50 border-indigo-100 text-indigo-900 cursor-move hover:bg-indigo-100";

                // Show Red/Green feedback if the question has been checked (disabled = true)
                if (disabled) {
                  itemStyles = isCorrect
                    ? "bg-green-50 border-green-200 text-green-800 cursor-default"
                    : "bg-red-50 border-red-200 text-red-800 cursor-default";
                }

                return (
                  <div
                    key={item.id}
                    draggable={!disabled}
                    onDragStart={(e) => {
                      if (!disabled)
                        e.dataTransfer.setData("text/plain", item.id);
                    }}
                    className={`px-3 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${itemStyles}`}
                  >
                    {item.text}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DragDropStudentQuestion;
