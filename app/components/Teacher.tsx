import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  LayoutDashboard,
  Flame,
  Trash2,
  PlusCircle,
  Pencil,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const TeacherDashboard = ({ onClose }: { onClose: () => void }) => {
  const stats = useQuery(api.teachers.getClassStats);
  const lessons = useQuery(api.lessons.getAll);
  const modules = useQuery(api.modules.getAll);
  const removeStudent = useMutation(api.teachers.removeStudent);
  const updateQuestions = useMutation(api.lessons.updateQuestions);
  const createLesson = useMutation(api.lessons.createLesson);
  const createModule = useMutation(api.modules.createModule);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const lessonDropdownRef = useRef<HTMLDivElement | null>(null);

  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleCode, setNewModuleCode] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleColor, setNewModuleColor] = useState("indigo");
  const [newModuleIconKey, setNewModuleIconKey] = useState<
    "bookOpen" | "beaker" | "atom"
  >("atom");

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("qxu5031");
  const [newLessonDifficulty, setNewLessonDifficulty] = useState("Beginner");
  const [newLessonXpReward, setNewLessonXpReward] = useState("100");
  const [newLessonOrder, setNewLessonOrder] = useState("");

  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const moduleDropdownRef = useRef<HTMLDivElement | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOptionNumber, setCorrectOptionNumber] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;
    if (!selectedLessonId) {
      setSelectedLessonId(lessons[0]._id);
    }
  }, [lessons, selectedLessonId]);

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    // Keep lesson creation course selection in sync with available modules
    if (!newLessonSection) {
      setNewLessonSection(modules[0].moduleKey);
    }
  }, [modules, newLessonSection]);

  useEffect(() => {
    if (!lessonDropdownOpen) return;

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (lessonDropdownRef.current?.contains(target)) return;
      setLessonDropdownOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLessonDropdownOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [lessonDropdownOpen]);

  useEffect(() => {
    if (!moduleDropdownOpen) return;

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (moduleDropdownRef.current?.contains(target)) return;
      setModuleDropdownOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModuleDropdownOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moduleDropdownOpen]);

  const selectedLesson =
    lessons?.find((lesson: any) => lesson._id === selectedLessonId) ?? null;

  const selectedModuleForNewLesson =
    modules?.find((m: any) => m.moduleKey === newLessonSection) ?? null;

  const resetNewModuleForm = () => {
    setNewModuleCode("");
    setNewModuleTitle("");
    setNewModuleDescription("");
    setNewModuleColor("indigo");
    setNewModuleIconKey("atom");
  };

  const resetNewLessonForm = () => {
    setNewLessonTitle("");
    setNewLessonDescription("");
    setNewLessonSection(modules?.[0]?.moduleKey || "qxu5031");
    setNewLessonDifficulty("Beginner");
    setNewLessonXpReward("100");
    setNewLessonOrder("");
  };

  const handleCreateModule = async () => {
    const code = newModuleCode.trim();
    const title = newModuleTitle.trim();
    const description = newModuleDescription.trim();

    if (!code) {
      alert("Module code is required (e.g. QXU7044).");
      return;
    }
    if (!title) {
      alert("Module title is required.");
      return;
    }
    if (!description) {
      alert("Module description is required.");
      return;
    }

    try {
      const res: any = await createModule({
        code,
        title,
        description,
        color: newModuleColor,
        iconKey: newModuleIconKey,
      });

      const moduleKey = res?.moduleKey;
      if (moduleKey) {
        setNewLessonSection(moduleKey);
      }
      setShowAddModule(false);
      resetNewModuleForm();
      alert("Module created.");
    } catch (e: any) {
      alert(e?.message || "Failed to create module.");
    }
  };

  const handleCreateLesson = async () => {
    const title = newLessonTitle.trim();
    const description = newLessonDescription.trim();
    const difficulty = newLessonDifficulty.trim();

    if (!title) {
      alert("Lesson title is required.");
      return;
    }
    if (!description) {
      alert("Lesson description is required.");
      return;
    }
    if (!difficulty) {
      alert("Lesson difficulty is required.");
      return;
    }

    const xpReward = parseInt(newLessonXpReward, 10);
    if (Number.isNaN(xpReward) || xpReward <= 0) {
      alert("XP reward must be a positive number.");
      return;
    }

    const orderTrim = newLessonOrder.trim();
    const order = orderTrim.length > 0 ? parseInt(orderTrim, 10) : undefined;
    if (
      orderTrim.length > 0 &&
      (order === undefined || Number.isNaN(order) || order <= 0)
    ) {
      alert("Order must be a positive number (or leave blank).");
      return;
    }

    const res: any = await createLesson({
      title,
      description,
      difficulty,
      xpReward,
      section: newLessonSection || undefined,
      order,
    });

    const createdId = res?.id;
    if (createdId) {
      setSelectedLessonId(createdId);
    }
    setLessonDropdownOpen(false);
    setShowAddLesson(false);
    setEditingIndex(null);
    resetForm();
    resetNewLessonForm();
    alert("Lesson created.");
  };

  const resetForm = () => {
    setQuestionText("");
    setOptionsText("");
    setCorrectOptionNumber("");
    setExplanation("");
    setImageUrl("");
  };

  const startAddNewQuestion = () => {
    setEditingIndex(null);
    resetForm();
  };

  const startEditQuestion = (index: number) => {
    if (!selectedLesson) return;
    const q = selectedLesson.questions[index];
    setEditingIndex(index);
    setQuestionText(q.question || "");
    setOptionsText((q.options || []).join("\n"));
    setCorrectOptionNumber(
      typeof q.correct === "number" ? String(q.correct + 1) : "1",
    );
    setExplanation(q.explanation || "");
    setImageUrl(q.imageUrl || "");
  };

  const handleSaveQuestion = async () => {
    if (!selectedLesson) return;

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      alert("Question text is required.");
      return;
    }

    const options = optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (options.length < 2) {
      alert("Please provide at least two answer options.");
      return;
    }

    const correctNum = parseInt(correctOptionNumber, 10);
    if (
      Number.isNaN(correctNum) ||
      correctNum < 1 ||
      correctNum > options.length
    ) {
      alert(`Correct option number must be between 1 and ${options.length}.`);
      return;
    }

    const newQuestion: any = {
      question: trimmedQuestion,
      options,
      correct: correctNum - 1,
      explanation: explanation.trim() || "No explanation provided.",
    };

    const trimmedImage = imageUrl.trim();
    if (trimmedImage) {
      newQuestion.imageUrl = trimmedImage;
    }

    const existing = selectedLesson.questions || [];
    const updatedQuestions =
      editingIndex === null
        ? [...existing, newQuestion]
        : existing.map((q: any, idx: number) =>
            idx === editingIndex ? newQuestion : q,
          );

    await updateQuestions({
      lessonId: selectedLesson._id,
      questions: updatedQuestions,
    });

    setEditingIndex(null);
    resetForm();
    alert("Question set saved for this lesson.");
  };

  const handleDeleteQuestion = async (index: number) => {
    if (!selectedLesson) return;

    const confirmDelete = window.confirm(
      `Delete question ${index + 1} from "${selectedLesson.title}"?`,
    );
    if (!confirmDelete) return;

    const existing = selectedLesson.questions || [];
    const updatedQuestions = existing.filter(
      (_q: any, idx: number) => idx !== index,
    );

    await updateQuestions({
      lessonId: selectedLesson._id,
      questions: updatedQuestions,
    });

    // Adjust editing state if needed
    setEditingIndex((current) => {
      if (current === null) return current;
      if (current === index) {
        resetForm();
        return null;
      }
      if (current > index) return current - 1;
      return current;
    });
  };

  // DELETE HANDLER
  const handleDelete = async (studentId: any, userId: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove Student ${userId}? \n\nThis will permanently delete their progress and XP.`,
    );

    if (confirmDelete) {
      await removeStudent({ id: studentId });
    }
  };

  if (!stats) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading Class Analytics...
          </p>
        </div>
      </div>
    );
  }

  const filteredStudents = stats.leaderboard.filter((student: any) => {
    const query = searchQuery.toLowerCase();
    return (
      student.userName?.toLowerCase().includes(query) ||
      student.userId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 p-6 font-sans">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            Professor's Dashboard
          </h1>
          <p className="text-slate-500">
            Overview of QXU5031 & QXU6033 Student Performance
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          className="bg-white hover:bg-slate-100"
        >
          Exit Teacher View
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Active Students
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.totalStudents}
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Class Average XP
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.avgXP}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Needs Attention
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.strugglingStudents}
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STUDENT TABLE */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Performance</CardTitle>
                <CardDescription>
                  Real-time tracking of completion rates
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Search student..."
                  className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  {/* SPLIT HEADERS */}
                  <th className="px-6 py-3 font-medium text-indigo-900">
                    First Name
                  </th>
                  <th className="px-6 py-3 font-medium text-indigo-900">
                    Last Name
                  </th>

                  <th className="px-6 py-3 font-medium">Student ID</th>
                  <th className="px-6 py-3 font-medium">XP Earned</th>
                  <th className="px-6 py-3 font-medium">Streak</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student: any) => {
                  // LOGIC TO SPLIT NAME
                  const fullName = student.userName || "Anonymous";
                  // Split by the first space found
                  const nameParts = fullName.split(" ");
                  const firstName = nameParts[0];
                  // Join the rest back together (handles names like "Von Neumann")
                  const lastName = nameParts.slice(1).join(" ") || "-";

                  return (
                    <tr
                      key={student.id}
                      className="bg-white border-b hover:bg-slate-50 transition-colors"
                    >
                      {/* FIRST NAME COLUMN */}
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {firstName}
                      </td>

                      {/* LAST NAME COLUMN */}
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {lastName}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-400 font-mono text-xs">
                        {student.userId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {student.xp} XP
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          {student.streak}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-[140px]">
                          <div
                            className="bg-indigo-600 h-2.5 rounded-full"
                            style={{ width: `${student.progressPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500 mt-1 inline-block">
                          {student.completedCount} / {stats.totalLessonsCount}{" "}
                          Lessons
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.progressPercent > 70 ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                            On Track
                          </span>
                        ) : student.progressPercent < 20 ? (
                          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold">
                            At Risk
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(student.id, fullName)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* LESSON / QUESTION SET MANAGEMENT */}
        <Card className="shadow-sm">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Lesson Question Sets</CardTitle>
                <CardDescription>
                  View, add, and edit questions for each lesson.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddLesson((v) => !v);
                    setLessonDropdownOpen(false);
                    setModuleDropdownOpen(false);
                    setShowAddModule(false);
                  }}
                  className="bg-white"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add lesson
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddModule((v) => !v);
                    setLessonDropdownOpen(false);
                    setModuleDropdownOpen(false);
                    setShowAddLesson(false);
                  }}
                  className="bg-white"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add module
                </Button>
                <label className="text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="font-medium mr-2">Select lesson:</span>
                  <div
                    ref={lessonDropdownRef}
                    className="relative min-w-[260px]"
                  >
                    <button
                      type="button"
                      disabled={!lessons || lessons.length === 0}
                      onClick={() => setLessonDropdownOpen((v) => !v)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left"
                      aria-haspopup="listbox"
                      aria-expanded={lessonDropdownOpen}
                    >
                      <span className="truncate text-slate-800">
                        {!lessons
                          ? "Loading lessons..."
                          : lessons.length === 0
                            ? "No lessons available"
                            : selectedLesson?.title || "Select a lesson"}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>

                    {lessonDropdownOpen && lessons && lessons.length > 0 && (
                      <div
                        role="listbox"
                        className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden"
                      >
                        <div className="max-h-64 overflow-y-auto py-1">
                          {lessons.map((lesson: any) => {
                            const isSelected = lesson._id === selectedLessonId;
                            return (
                              <button
                                key={lesson._id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSelectedLessonId(lesson._id);
                                  setLessonDropdownOpen(false);
                                  setEditingIndex(null);
                                  resetForm();
                                }}
                                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-900"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div className="font-medium truncate">
                                  {lesson.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {showAddModule && (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Create a new module
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Modules show up as course tiles on the student dashboard.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddModule(false);
                      resetNewModuleForm();
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Module code
                      </label>
                      <input
                        type="text"
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newModuleCode}
                        onChange={(e) => setNewModuleCode(e.target.value)}
                        placeholder="e.g., QXU7044"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Module title
                      </label>
                      <input
                        type="text"
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        placeholder="e.g., Polymer Processing"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newModuleDescription}
                      onChange={(e) => setNewModuleDescription(e.target.value)}
                      placeholder="Short description shown on the course tile."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Color theme
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "indigo",
                          "pink",
                          "blue",
                          "emerald",
                          "amber",
                          "violet",
                          "rose",
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewModuleColor(c)}
                            className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                              newModuleColor === c
                                ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Icon
                      </label>
                      <div className="flex gap-2">
                        {[
                          { key: "bookOpen", label: "Book" },
                          { key: "beaker", label: "Beaker" },
                          { key: "atom", label: "Atom" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setNewModuleIconKey(opt.key as any)}
                            className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                              newModuleIconKey === opt.key
                                ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetNewModuleForm}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleCreateModule}>
                      Create module
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showAddLesson && (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Create a new lesson
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      This lesson will be visible to all students.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddLesson(false);
                      resetNewLessonForm();
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Course
                      </label>
                      <div ref={moduleDropdownRef} className="relative">
                        <button
                          type="button"
                          disabled={!modules || modules.length === 0}
                          onClick={() => setModuleDropdownOpen((v) => !v)}
                          className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left"
                          aria-haspopup="listbox"
                          aria-expanded={moduleDropdownOpen}
                        >
                          <span className="truncate text-slate-800">
                            {!modules
                              ? "Loading modules..."
                              : modules.length === 0
                                ? "No modules"
                                : selectedModuleForNewLesson
                                  ? `${selectedModuleForNewLesson.code} — ${selectedModuleForNewLesson.title}`
                                  : "Select a module"}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        </button>

                        {moduleDropdownOpen &&
                          modules &&
                          modules.length > 0 && (
                            <div
                              role="listbox"
                              className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden"
                            >
                              <div className="max-h-64 overflow-y-auto py-1">
                                {modules.map((m: any) => {
                                  const isSelected =
                                    m.moduleKey === newLessonSection;
                                  return (
                                    <button
                                      key={m.moduleKey}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => {
                                        setNewLessonSection(m.moduleKey);
                                        setModuleDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                        isSelected
                                          ? "bg-indigo-50 text-indigo-900"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="font-medium truncate">
                                        {m.code} — {m.title}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {m.description}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Difficulty
                      </label>
                      <input
                        type="text"
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newLessonDifficulty}
                        onChange={(e) => setNewLessonDifficulty(e.target.value)}
                        placeholder="Beginner / Intermediate / Advanced / Expert"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Lesson title
                    </label>
                    <input
                      type="text"
                      className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder="e.g., 9. Polymer Characterisation"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLessonDescription}
                      onChange={(e) => setNewLessonDescription(e.target.value)}
                      placeholder="Short description shown to students."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        XP reward
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newLessonXpReward}
                        onChange={(e) => setNewLessonXpReward(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Order
                        <span className="font-normal text-slate-500">
                          {" "}
                          (optional)
                        </span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newLessonOrder}
                        onChange={(e) => setNewLessonOrder(e.target.value)}
                        placeholder="Auto"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetNewLessonForm();
                      }}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleCreateLesson}>
                      Create lesson
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!selectedLesson && (
              <p className="text-sm text-slate-500">
                {lessons && lessons.length === 0
                  ? "No lessons found. Use the curriculum tools to initialise content first."
                  : "Select a lesson to view its question set."}
              </p>
            )}

            {selectedLesson && (
              <>
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selectedLesson.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedLesson.description}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-600 mt-2 md:mt-0">
                      <span>
                        Difficulty:{" "}
                        <span className="font-semibold">
                          {selectedLesson.difficulty}
                        </span>
                      </span>
                      <span>
                        XP:{" "}
                        <span className="font-semibold">
                          {selectedLesson.xpReward}
                        </span>
                      </span>
                      <span>
                        Questions:{" "}
                        <span className="font-semibold">
                          {selectedLesson.questions?.length || 0}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Existing questions overview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Current question set
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startAddNewQuestion}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Add new question
                    </Button>
                  </div>

                  {selectedLesson.questions &&
                  selectedLesson.questions.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedLesson.questions.map((q: any, idx: number) => (
                        <div
                          key={idx}
                          className="border rounded-md p-3 bg-white flex justify-between gap-3"
                        >
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 mb-1">
                              Q{idx + 1}
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {q.question}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Correct answer:{" "}
                              <span className="font-semibold">
                                {q.options?.[q.correct] ?? "Not set"}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 hover:bg-slate-100"
                              onClick={() => startEditQuestion(idx)}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteQuestion(idx)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      This lesson does not have any questions yet.
                    </p>
                  )}
                </div>

                {/* Edit / add form */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">
                    {editingIndex === null
                      ? "Add a new question"
                      : `Edit question ${editingIndex + 1}`}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Question text
                      </label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Answer options (one per line)
                      </label>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={optionsText}
                        onChange={(e) => setOptionsText(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-700">
                          Correct option number
                          <span className="font-normal text-slate-500">
                            {" "}
                            (1 = first line)
                          </span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={correctOptionNumber}
                          onChange={(e) =>
                            setCorrectOptionNumber(e.target.value)
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-700">
                          Optional image URL
                        </label>
                        <input
                          type="text"
                          className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Explanation
                      </label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingIndex(null);
                          resetForm();
                        }}
                      >
                        Clear
                      </Button>
                      <Button size="sm" onClick={handleSaveQuestion}>
                        {editingIndex === null
                          ? "Add question to set"
                          : "Save changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
