"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/teacher/useToast";
import { ToastContainer } from "@/components/teacher/InlineToast";
import { ConfirmDialog } from "@/components/teacher/ConfirmDialog";

// ── Types ──────────────────────────────────────────────────────────────────────
type DragDropItem = { id: string; text: string };
type FieldErrors = Record<string, string>;

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * ContentManager — teacher content management page rendered at `/teacher/content`.
 *
 * Manages modules, lessons, questions (MCQ, drag-and-drop, fill-in-the-blank),
 * and glossary terms. All mutations are performed via Convex hooks. Destructive
 * actions use `ConfirmDialog` instead of `window.confirm`, and feedback is
 * delivered via `useToast` / `InlineToast` instead of `window.alert`. Inline
 * field validation errors are shown adjacent to invalid inputs without blocking
 * the UI with browser dialogs.
 *
 * Accepts no props — fetches all data internally.
 */
export function ContentManager() {
  const { user } = useUser();
  const { toasts, toast, dismiss } = useToast();

  // ── Convex queries & mutations ──────────────────────────────────────────────
  const lessons = useQuery(api.lessons.getAll);
  const modules = useQuery(api.modules.getAll);
  const glossary = useQuery(api.glossary.getAll);

  const ensureDefaultModules = useMutation(api.modules.ensureDefaultModules);
  const createModule = useMutation(api.modules.createModule);
  const updateModule = useMutation(api.modules.updateModule);
  const deleteModule = useMutation(api.modules.deleteModule);
  const reorderModules = useMutation(api.modules.reorderModules);
  const createLesson = useMutation(api.lessons.createLesson);
  const updateLesson = useMutation(api.lessons.updateLesson);
  const deleteLesson = useMutation(api.lessons.deleteLesson);
  const reorderLessons = useMutation(api.lessons.reorderLessons);
  const updateQuestions = useMutation(api.lessons.updateQuestions);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const createGlossaryTerm = useMutation(api.glossary.createTerm);
  const updateGlossaryTerm = useMutation(api.glossary.updateTerm);
  const deleteGlossaryTerm = useMutation(api.glossary.deleteTerm);

  // ── Confirm dialog state ────────────────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");

  const requestConfirm = (title: string, description: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setPendingAction(() => action);
  };

  // ── Field errors ────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  // ── Lesson selection & dropdowns ────────────────────────────────────────────
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const [moduleFilterDropdownOpen, setModuleFilterDropdownOpen] = useState(false);
  const [lessonModuleFilter, setLessonModuleFilter] = useState<string>("all");
  const lessonDropdownRef = useRef<HTMLDivElement | null>(null);
  const moduleDropdownRef = useRef<HTMLDivElement | null>(null);
  const moduleFilterDropdownRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // ── Module form state ───────────────────────────────────────────────────────
  const [showAddModule, setShowAddModule] = useState(false);
  const [showManageModules, setShowManageModules] = useState(false);
  const [newModuleCode, setNewModuleCode] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleColor, setNewModuleColor] = useState("indigo");
  const [newModuleIconKey, setNewModuleIconKey] = useState<"bookOpen" | "beaker" | "atom">("atom");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  // ── Lesson form state ───────────────────────────────────────────────────────
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showManageLessons, setShowManageLessons] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("qxu5031");
  const [newLessonDifficulty, setNewLessonDifficulty] = useState("Beginner");
  const [newLessonXpReward, setNewLessonXpReward] = useState("100");
  const [newLessonOrder, setNewLessonOrder] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // ── Question editor state ───────────────────────────────────────────────────
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<"mcq" | "dragdrop" | "fillblank">("mcq");
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOptionNumber, setCorrectOptionNumber] = useState("");
  const [fillCorrectAnswer, setFillCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageStorageId, setImageStorageId] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());

  // ── Drag & drop question builder state ─────────────────────────────────────
  const [ddAnswerBank, setDdAnswerBank] = useState<DragDropItem[]>([]);
  const [ddSections, setDdSections] = useState<Array<{ name: string; answers: DragDropItem[] }>>([
    { name: "Section 1", answers: [] },
    { name: "Section 2", answers: [] },
  ]);
  const [ddBankInput, setDdBankInput] = useState("");

  // ── Drag reorder state ──────────────────────────────────────────────────────
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [moduleDropTargetId, setModuleDropTargetId] = useState<string | null>(null);
  const [lessonDropTargetId, setLessonDropTargetId] = useState<string | null>(null);

  // ── Glossary state ──────────────────────────────────────────────────────────
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [editingGlossaryId, setEditingGlossaryId] = useState<string | null>(null);
  const [newGlossaryTerm, setNewGlossaryTerm] = useState("");
  const [newGlossaryDef, setNewGlossaryDef] = useState("");

  // ── Convex queries ──────────────────────────────────────────────────────────
  const storagePreviewUrl = useQuery(
    api.uploads.getFileUrl,
    imageStorageId ? { storageId: imageStorageId as Id<"_storage"> } : "skip",
  );

  // ── Memos ───────────────────────────────────────────────────────────────────
  const previewUrl = useMemo(() => {
    if (storagePreviewUrl) return storagePreviewUrl;
    const raw = imageUrl.trim();
    if (!raw || brokenLinks.has(raw)) return "";
    return raw;
  }, [imageUrl, storagePreviewUrl, brokenLinks]);

  const filteredLessons = useMemo(() => {
    if (!lessons) return [];
    if (lessonModuleFilter === "all") return lessons;
    return lessons.filter((l: any) => (l.section || "") === lessonModuleFilter);
  }, [lessons, lessonModuleFilter]);

  const selectedLesson = useMemo(
    () => lessons?.find((l: any) => l._id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );

  const selectedModuleForNewLesson = useMemo(
    () => modules?.find((m: any) => m.moduleKey === newLessonSection) ?? null,
    [modules, newLessonSection],
  );

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      void ensureDefaultModules().catch((err) =>
        console.error("Failed to ensure default modules:", err),
      );
    }
  }, [ensureDefaultModules, user]);

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;
    if (filteredLessons.length === 0) { setSelectedLessonId(null); return; }
    if (!selectedLessonId) { setSelectedLessonId(filteredLessons[0]._id); return; }
    const stillVisible = filteredLessons.some((l: any) => l._id === selectedLessonId);
    if (!stillVisible) setSelectedLessonId(filteredLessons[0]._id);
  }, [lessons, filteredLessons, selectedLessonId]);

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    if (!newLessonSection) setNewLessonSection(modules[0].moduleKey);
  }, [modules, newLessonSection]);

  // Click-outside handlers
  useEffect(() => {
    if (!lessonDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!lessonDropdownRef.current?.contains(e.target as Node)) setLessonDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLessonDropdownOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [lessonDropdownOpen]);

  useEffect(() => {
    if (!moduleDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!moduleDropdownRef.current?.contains(e.target as Node)) setModuleDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModuleDropdownOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [moduleDropdownOpen]);

  useEffect(() => {
    if (!moduleFilterDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!moduleFilterDropdownRef.current?.contains(e.target as Node)) setModuleFilterDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModuleFilterDropdownOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [moduleFilterDropdownOpen]);

  // ── Reset helpers ───────────────────────────────────────────────────────────
  const resetNewModuleForm = () => {
    setEditingModuleId(null);
    setNewModuleCode("");
    setNewModuleTitle("");
    setNewModuleDescription("");
    setNewModuleColor("indigo");
    setNewModuleIconKey("atom");
    setFieldErrors({});
  };

  const resetNewLessonForm = () => {
    setEditingLessonId(null);
    setNewLessonTitle("");
    setNewLessonDescription("");
    setNewLessonSection(modules?.[0]?.moduleKey || "qxu5031");
    setNewLessonDifficulty("Beginner");
    setNewLessonXpReward("100");
    setNewLessonOrder("");
    setFieldErrors({});
  };

  const resetQuestionForm = () => {
    setQuestionType("mcq");
    setQuestionText("");
    setOptionsText("");
    setCorrectOptionNumber("");
    setFillCorrectAnswer("");
    setExplanation("");
    setImageUrl("");
    setImageStorageId("");
    setImageFileName("");
    setDdAnswerBank([]);
    setDdSections([
      { name: "Section 1", answers: [] },
      { name: "Section 2", answers: [] },
    ]);
    setFieldErrors({});
  };

  const resetGlossaryForm = () => {
    setEditingGlossaryId(null);
    setNewGlossaryTerm("");
    setNewGlossaryDef("");
    setFieldErrors({});
  };

  // ── Module handlers ─────────────────────────────────────────────────────────
  const startEditModule = (module: any) => {
    if (!module?._id) return;
    setEditingModuleId(module._id);
    setLessonDropdownOpen(false);
    setModuleDropdownOpen(false);
    setModuleFilterDropdownOpen(false);
    setNewModuleCode(module.code || "");
    setNewModuleTitle(module.title || "");
    setNewModuleDescription(module.description || "");
    setNewModuleColor(module.color || "indigo");
    setNewModuleIconKey(module.iconKey || "atom");
    setFieldErrors({});
  };

  const handleSaveModule = async () => {
    const code = newModuleCode.trim();
    const title = newModuleTitle.trim();
    const description = newModuleDescription.trim();

    const errors: FieldErrors = {};
    if (!code) errors.moduleCode = "Module code is required (e.g. QXU7044).";
    if (!title) errors.moduleTitle = "Module title is required.";
    if (!description) errors.moduleDescription = "Module description is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    try {
      if (editingModuleId) {
        const res: any = await updateModule({
          id: editingModuleId as Id<"modules">,
          code, title, description,
          color: newModuleColor,
          iconKey: newModuleIconKey,
        });
        if (res?.moduleKey) setNewLessonSection(res.moduleKey);
        toast("success", "Module updated.");
      } else {
        const res: any = await createModule({
          code, title, description,
          color: newModuleColor,
          iconKey: newModuleIconKey,
        });
        if (res?.moduleKey) setNewLessonSection(res.moduleKey);
        toast("success", "Module created.");
      }
      setShowAddModule(false);
      resetNewModuleForm();
    } catch (e: any) {
      toast("error", e?.message || "Failed to save module.");
    }
  };

  const handleDeleteModule = (module: any) => {
    if (!module?._id) return;
    requestConfirm(
      "Delete module",
      `Delete module "${module.code} — ${module.title}"? This cannot be undone.`,
      async () => {
        try {
          await deleteModule({ id: module._id });
          if (editingModuleId === module._id) resetNewModuleForm();
          toast("success", "Module deleted.");
        } catch (e: any) {
          toast("error", e?.message || "Failed to delete module.");
        }
      },
    );
  };

  // ── Lesson handlers ─────────────────────────────────────────────────────────
  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson._id);
    setLessonDropdownOpen(false);
    setModuleDropdownOpen(false);
    setModuleFilterDropdownOpen(false);
    setNewLessonTitle(lesson.title || "");
    setNewLessonDescription(lesson.description || "");
    setNewLessonSection(lesson.section || modules?.[0]?.moduleKey || "qxu5031");
    setNewLessonDifficulty(lesson.difficulty || "Beginner");
    setNewLessonXpReward(String(lesson.xpReward || 100));
    setNewLessonOrder(String(lesson.order || ""));
    setFieldErrors({});
  };

  const handleSaveLesson = async () => {
    const title = newLessonTitle.trim();
    const description = newLessonDescription.trim();
    const difficulty = newLessonDifficulty.trim();
    const xpReward = parseInt(newLessonXpReward, 10);
    const orderTrim = newLessonOrder.trim();
    const order = orderTrim.length > 0 ? parseInt(orderTrim, 10) : undefined;

    const errors: FieldErrors = {};
    if (!title) errors.lessonTitle = "Lesson title is required.";
    if (!description) errors.lessonDescription = "Lesson description is required.";
    if (!difficulty) errors.lessonDifficulty = "Lesson difficulty is required.";
    if (Number.isNaN(xpReward) || xpReward <= 0) errors.lessonXp = "XP reward must be a positive number.";
    if (orderTrim.length > 0 && (order === undefined || Number.isNaN(order) || order <= 0))
      errors.lessonOrder = "Order must be a positive number (or leave blank).";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    try {
      if (editingLessonId) {
        await updateLesson({
          id: editingLessonId as Id<"lessons">,
          title, description, difficulty, xpReward,
          section: newLessonSection || undefined,
          order,
        });
        setSelectedLessonId(editingLessonId);
        toast("success", "Lesson updated.");
      } else {
        const res: any = await createLesson({
          title, description, difficulty, xpReward,
          section: newLessonSection || undefined,
          order,
        });
        if (res?.id) setSelectedLessonId(res.id);
        toast("success", "Lesson created.");
      }
      setLessonDropdownOpen(false);
      setShowAddLesson(false);
      setEditingIndex(null);
      resetQuestionForm();
      resetNewLessonForm();
    } catch (e: any) {
      toast("error", e?.message || "Failed to save lesson.");
    }
  };

  const handleDeleteLesson = (lesson: any) => {
    requestConfirm(
      "Delete lesson",
      `Delete lesson "${lesson.title}"? This also deletes its question images.`,
      async () => {
        try {
          await deleteLesson({ id: lesson._id });
          if (selectedLessonId === lesson._id) {
            const next = (lessons || []).find((l: any) => l._id !== lesson._id);
            setSelectedLessonId(next?._id || null);
            setEditingIndex(null);
            resetQuestionForm();
          }
          if (editingLessonId === lesson._id) {
            resetNewLessonForm();
            setShowAddLesson(false);
          }
          toast("success", "Lesson deleted.");
        } catch (e: any) {
          toast("error", e?.message || "Failed to delete lesson.");
        }
      },
    );
  };

  // ── Drag reorder helpers ────────────────────────────────────────────────────
  const reorderById = <T extends { _id: string }>(list: T[], draggedId: string, targetId: string) => {
    if (draggedId === targetId) return list;
    const di = list.findIndex((i) => i._id === draggedId);
    const ti = list.findIndex((i) => i._id === targetId);
    if (di < 0 || ti < 0) return list;
    const next = [...list];
    const [moved] = next.splice(di, 1);
    next.splice(ti, 0, moved);
    return next;
  };

  const handleDropModule = async (targetId: string) => {
    if (!draggedModuleId || !modules) return;
    const reordered = reorderById(modules as any[], draggedModuleId, targetId);
    const ids = reordered.map((m) => m._id).filter(Boolean) as Id<"modules">[];
    if (ids.length === 0) return;
    try {
      await reorderModules({ moduleIds: ids });
    } catch (e: any) {
      toast("error", e?.message || "Failed to reorder modules.");
    }
  };

  const handleDropLesson = async (targetId: string) => {
    if (!draggedLessonId || !lessons) return;
    const reordered = reorderById(lessons as any[], draggedLessonId, targetId);
    const ids = reordered.map((l) => l._id).filter(Boolean) as Id<"lessons">[];
    if (ids.length === 0) return;
    try {
      await reorderLessons({ lessonIds: ids });
    } catch (e: any) {
      toast("error", e?.message || "Failed to reorder lessons.");
    }
  };

  // ── Question handlers ───────────────────────────────────────────────────────
  const startAddNewQuestion = () => {
    setEditingIndex(null);
    resetQuestionForm();
    setShowQuestionModal(true);
  };

  const startEditQuestion = (index: number) => {
    if (!selectedLesson) return;
    const q = selectedLesson.questions[index] as any;
    setEditingIndex(index);
    if (q.type === "dragdrop") setQuestionType("dragdrop");
    else if (q.type === "fillblank") setQuestionType("fillblank");
    else setQuestionType("mcq");
    setQuestionText(q.question || "");
    setOptionsText((q.options || []).join("\n"));
    setCorrectOptionNumber(typeof q.correct === "number" ? String(q.correct + 1) : "1");
    setFillCorrectAnswer(q.correctAnswer || "");
    setExplanation(q.explanation || "");
    setImageUrl(q.imageUrl || "");
    setImageStorageId(q.imageStorageId || "");
    setImageFileName("");
    if (q.type === "dragdrop") {
      const ensureId = (text: string): DragDropItem => ({ id: crypto.randomUUID(), text });
      setDdAnswerBank((q.answerBank || []).map(ensureId));
      setDdSections(
        q.sections?.length > 0
          ? q.sections.map((s: any) => ({ name: s.name, answers: (s.answers || []).map(ensureId) }))
          : [{ name: "Section 1", answers: [] }, { name: "Section 2", answers: [] }],
      );
    } else {
      setDdAnswerBank([]);
      setDdSections([{ name: "Section 1", answers: [] }, { name: "Section 2", answers: [] }]);
    }
    setFieldErrors({});
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!selectedLesson) return;
    const trimmedQuestion = questionText.trim();
    const errors: FieldErrors = {};

    if (!trimmedQuestion) errors.questionText = "Question text is required.";

    let newQuestion: any = { type: questionType, question: trimmedQuestion };

    if (questionType === "mcq") {
      const options = optionsText.split("\n").map((o) => o.trim()).filter((o) => o.length > 0);
      const correctNum = parseInt(correctOptionNumber, 10);
      if (options.length < 2) errors.options = "Please provide at least two answer options.";
      if (Number.isNaN(correctNum) || correctNum < 1 || correctNum > options.length)
        errors.correctOption = `Correct option number must be between 1 and ${options.length || "N"}.`;
      if (Object.keys(errors).length === 0) {
        newQuestion = { ...newQuestion, options, correct: correctNum - 1, explanation: explanation.trim() || "No explanation provided." };
      }
    } else if (questionType === "fillblank") {
      const correctAnswer = fillCorrectAnswer.trim();
      if (!correctAnswer) errors.fillAnswer = "Correct answer is required for fill-in-the-blank questions.";
      if (!trimmedQuestion.includes("___")) errors.questionText = "Question text must include '___' to indicate the blank.";
      if (Object.keys(errors).length === 0) {
        newQuestion = { ...newQuestion, correctAnswer, explanation: explanation.trim() || "No explanation provided." };
      }
    } else if (questionType === "dragdrop") {
      if (ddAnswerBank.length === 0 && ddSections.every((s) => s.answers.length === 0))
        errors.ddBank = "Please add at least one answer to the bank or a section.";
      if (ddSections.length < 2) errors.ddSections = "Please provide at least two sections.";
      if (Object.keys(errors).length === 0) {
        newQuestion = {
          ...newQuestion,
          answerBank: ddAnswerBank.map((a) => a.text),
          sections: ddSections.map((s) => ({ name: s.name, answers: s.answers.map((a) => a.text) })),
          explanation: explanation.trim() || "No explanation provided.",
        };
      }
    }

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    const trimmedImage = imageUrl.trim();
    if (trimmedImage) newQuestion.imageUrl = trimmedImage;
    const trimmedStorageId = imageStorageId.trim();
    if (trimmedStorageId) newQuestion.imageStorageId = trimmedStorageId;

    const existing = selectedLesson.questions || [];
    const updatedQuestions =
      editingIndex === null
        ? [...existing, newQuestion]
        : existing.map((q: any, idx: number) => (idx === editingIndex ? newQuestion : q));

    try {
      await updateQuestions({ lessonId: selectedLesson._id, questions: updatedQuestions });
      setEditingIndex(null);
      resetQuestionForm();
      setShowQuestionModal(false);
      toast("success", "Question set saved for this lesson.");
    } catch (e: any) {
      toast("error", e?.message || "Failed to save question.");
    }
  };

  const handleDeleteQuestion = (index: number) => {
    if (!selectedLesson) return;
    requestConfirm(
      "Delete question",
      `Delete question ${index + 1} from "${selectedLesson.title}"?`,
      async () => {
        try {
          const existing = selectedLesson.questions || [];
          const updatedQuestions = existing.filter((_q: any, idx: number) => idx !== index);
          await updateQuestions({ lessonId: selectedLesson._id, questions: updatedQuestions });
          setEditingIndex((current) => {
            if (current === null) return current;
            if (current === index) { resetQuestionForm(); return null; }
            if (current > index) return current - 1;
            return current;
          });
          toast("success", "Question deleted.");
        } catch (e: any) {
          toast("error", e?.message || "Failed to delete question.");
        }
      },
    );
  };

  // ── Image upload ────────────────────────────────────────────────────────────
  const processAndUpload = async (image: HTMLImageElement, _fileType: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, targetSize, targetSize);
    const scale = Math.min(targetSize / image.width, targetSize / image.height);
    const x = (targetSize - image.width * scale) / 2;
    const y = (targetSize - image.height * scale) / 2;
    ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (!blob) throw new Error("Blob generation failed");
    try {
      const postUrl = await generateUploadUrl();
      if (!postUrl) throw new Error("Upload URL not available");
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(errorText || "Storage upload failed");
      }
      const { storageId } = await result.json();
      if (!storageId) throw new Error("Upload response missing storageId");
      setImageStorageId(storageId);
      toast("success", "Image uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast("error", "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setImageFileName(file.name);
    setImageUrl("");
    setImageStorageId("");
    const reader = new FileReader();
    reader.onerror = () => { setIsUploading(false); toast("error", "Could not read the file. Please try a different image."); };
    reader.onload = () => {
      const imgElement = new Image();
      imgElement.crossOrigin = "anonymous";
      imgElement.onerror = () => { setIsUploading(false); toast("error", "Could not load the image. Please try a different file."); };
      imgElement.onload = () => {
        processAndUpload(imgElement, file.type).catch((err) => {
          console.error("Upload error:", err);
          setIsUploading(false);
          toast("error", "Could not process image. Try downloading the file and uploading it directly.");
        });
      };
      const result = reader.result;
      if (typeof result === "string") imgElement.src = result;
      else { setIsUploading(false); toast("error", "Could not read the file. Please try a different image."); }
    };
    reader.readAsDataURL(file);
  };

  // ── Glossary handlers ───────────────────────────────────────────────────────
  const startEditGlossaryTerm = (term: any) => {
    setEditingGlossaryId(term._id);
    setNewGlossaryTerm(term.term);
    setNewGlossaryDef(term.definition);
    setFieldErrors({});
  };

  const handleSaveGlossaryTerm = async () => {
    const term = newGlossaryTerm.trim();
    const definition = newGlossaryDef.trim();
    const errors: FieldErrors = {};
    if (!term) errors.glossaryTerm = "Term is required.";
    if (!definition) errors.glossaryDef = "Definition is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    try {
      if (editingGlossaryId) {
        await updateGlossaryTerm({ id: editingGlossaryId as Id<"glossary">, term, definition });
        toast("success", "Glossary term updated.");
      } else {
        await createGlossaryTerm({ term, definition });
        toast("success", "Glossary term created.");
      }
      resetGlossaryForm();
    } catch (e: any) {
      toast("error", e?.message || "Failed to save glossary term.");
    }
  };

  const handleDeleteGlossaryTerm = (term: any) => {
    requestConfirm(
      "Delete glossary term",
      `Delete glossary term "${term.term}"?`,
      async () => {
        try {
          await deleteGlossaryTerm({ id: term._id });
          if (editingGlossaryId === term._id) resetGlossaryForm();
          toast("success", "Glossary term deleted.");
        } catch (e: any) {
          toast("error", e?.message || "Failed to delete glossary term.");
        }
      },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 p-3 lg:p-4 font-sans">

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={pendingAction !== null}
        title={confirmTitle}
        description={confirmDescription}
        destructive
        onConfirm={() => {
          pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />

      <div className="space-y-4">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Manager</h1>
          <p className="text-slate-500 text-sm mt-1">Manage modules, lessons, questions, and glossary.</p>
        </div>

        {/* ── Action bar ── */}
        <Card className="shadow-sm">
          <CardHeader className="bg-white border-b border-slate-100 pb-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Lesson Question Sets</CardTitle>
              </div>
              {/* Button row */}
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { setShowAddModule((v) => !v); setEditingModuleId(null); resetNewModuleForm(); setShowAddLesson(false); }} className="bg-white text-xs h-7 px-2">
                  <PlusCircle className="w-3 h-3 mr-1" /> Module
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddLesson((v) => !v); setEditingLessonId(null); resetNewLessonForm(); setShowAddModule(false); }} className="bg-white text-xs h-7 px-2">
                  <PlusCircle className="w-3 h-3 mr-1" /> Lesson
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowManageModules((v) => { const n = !v; if (n) setShowManageLessons(false); return n; }); }} className="bg-white text-xs h-7 px-2">
                  {showManageModules ? "Hide modules" : "Modules"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowManageLessons((v) => { const n = !v; if (n) setShowManageModules(false); return n; }); }} className="bg-white text-xs h-7 px-2">
                  {showManageLessons ? "Hide lessons" : "Lessons"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowGlossaryModal(true); resetGlossaryForm(); }} className="bg-white text-xs h-7 px-2">
                  Glossary
                </Button>
              </div>
              {/* Selectors row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Module filter dropdown */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">Module</span>
                  <div ref={moduleFilterDropdownRef} className="relative">
                    <button type="button" onClick={() => setModuleFilterDropdownOpen((v) => !v)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white text-xs pl-2 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between text-left">
                      <span className="truncate text-slate-800">
                        {lessonModuleFilter === "all" ? "All modules" : (() => {
                          const m = (modules || []).find((mod: any) => mod.moduleKey === lessonModuleFilter);
                          return m ? `${m.code}` : "All";
                        })()}
                      </span>
                      <ChevronDown className="ml-1 h-3 w-3 text-slate-400 flex-shrink-0" />
                    </button>
                    {moduleFilterDropdownOpen && (
                      <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {[{ key: "all", label: "All modules" }, ...(modules || []).map((m: any) => ({ key: m.moduleKey, label: `${m.code} — ${m.title}` }))].map((opt) => (
                            <button key={opt.key} type="button"
                              onClick={() => { setLessonModuleFilter(opt.key); setModuleFilterDropdownOpen(false); }}
                              className={`w-full px-3 py-2 text-xs text-left transition-colors ${lessonModuleFilter === opt.key ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"}`}>
                              <div className="font-medium truncate">{opt.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lesson selector dropdown */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">Lesson</span>
                  <div ref={lessonDropdownRef} className="relative">
                    <button type="button" disabled={!filteredLessons || filteredLessons.length === 0}
                      onClick={() => setLessonDropdownOpen((v) => !v)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white text-xs pl-2 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left">
                      <span className="truncate text-slate-800">
                        {!lessons ? "Loading..." : filteredLessons.length === 0 ? "No lessons" : selectedLesson?.title || "Select"}
                      </span>
                      <ChevronDown className="ml-1 h-3 w-3 text-slate-400 flex-shrink-0" />
                    </button>
                    {lessonDropdownOpen && filteredLessons && filteredLessons.length > 0 && (
                      <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredLessons.map((lesson: any) => (
                            <button key={lesson._id} type="button"
                              onClick={() => { setSelectedLessonId(lesson._id); setLessonDropdownOpen(false); setEditingIndex(null); resetQuestionForm(); }}
                              className={`w-full px-3 py-2 text-xs text-left transition-colors ${lesson._id === selectedLessonId ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"}`}>
                              <div className="font-medium truncate">{lesson.title}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ── Add Module inline form ── */}
            {showAddModule && (
              <div className="border-b border-slate-100 p-4 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 mb-3">{editingModuleId ? "Edit module" : "New module"}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Module code</label>
                    <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newModuleCode} onChange={(e) => { setNewModuleCode(e.target.value); clearFieldError("moduleCode"); }} />
                    {fieldErrors.moduleCode && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleCode}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Module title</label>
                    <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newModuleTitle} onChange={(e) => { setNewModuleTitle(e.target.value); clearFieldError("moduleTitle"); }} />
                    {fieldErrors.moduleTitle && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleTitle}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <textarea rows={2} className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newModuleDescription} onChange={(e) => { setNewModuleDescription(e.target.value); clearFieldError("moduleDescription"); }} />
                  {fieldErrors.moduleDescription && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleDescription}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Color theme</label>
                    <div className="flex flex-wrap gap-2">
                      {["indigo","pink","blue","emerald","amber","violet","rose"].map((c) => (
                        <button key={c} type="button" onClick={() => setNewModuleColor(c)}
                          className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${newModuleColor === c ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Icon</label>
                    <div className="flex gap-2">
                      {[{ key: "bookOpen", label: "Book" }, { key: "beaker", label: "Beaker" }, { key: "atom", label: "Atom" }].map((opt) => (
                        <button key={opt.key} type="button" onClick={() => setNewModuleIconKey(opt.key as any)}
                          className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${newModuleIconKey === opt.key ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddModule(false); resetNewModuleForm(); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveModule}>Save module</Button>
                </div>
              </div>
            )}

            {/* ── Add Lesson inline form ── */}
            {showAddLesson && (
              <div className="border-b border-slate-100 p-4 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 mb-3">{editingLessonId ? "Edit lesson" : "New lesson"}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Course</label>
                    <div ref={moduleDropdownRef} className="relative">
                      <button type="button" disabled={!modules || modules.length === 0} onClick={() => setModuleDropdownOpen((v) => !v)}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 flex items-center justify-between text-left">
                        <span className="truncate text-slate-800">
                          {!modules ? "Loading..." : modules.length === 0 ? "No modules" : selectedModuleForNewLesson ? `${selectedModuleForNewLesson.code} — ${selectedModuleForNewLesson.title}` : "Select a module"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                      </button>
                      {moduleDropdownOpen && modules && modules.length > 0 && (
                        <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                          <div className="max-h-48 overflow-y-auto py-1">
                            {modules.map((m: any) => (
                              <button key={m.moduleKey} type="button" onClick={() => { setNewLessonSection(m.moduleKey); setModuleDropdownOpen(false); }}
                                className={`w-full px-3 py-2 text-sm text-left transition-colors ${m.moduleKey === newLessonSection ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"}`}>
                                <div className="font-medium truncate">{m.code} — {m.title}</div>
                                <div className="text-xs text-slate-500 truncate mt-0.5">{m.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Difficulty</label>
                    <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLessonDifficulty} onChange={(e) => { setNewLessonDifficulty(e.target.value); clearFieldError("lessonDifficulty"); }} />
                    {fieldErrors.lessonDifficulty && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonDifficulty}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <label className="text-xs font-medium text-slate-700">Lesson title</label>
                  <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newLessonTitle} onChange={(e) => { setNewLessonTitle(e.target.value); clearFieldError("lessonTitle"); }} />
                  {fieldErrors.lessonTitle && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonTitle}</p>}
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <textarea rows={2} className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newLessonDescription} onChange={(e) => { setNewLessonDescription(e.target.value); clearFieldError("lessonDescription"); }} />
                  {fieldErrors.lessonDescription && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonDescription}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">XP reward</label>
                    <input type="number" min={1} className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLessonXpReward} onChange={(e) => { setNewLessonXpReward(e.target.value); clearFieldError("lessonXp"); }} />
                    {fieldErrors.lessonXp && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonXp}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Order <span className="font-normal text-slate-500">(optional)</span></label>
                    <input type="number" min={1} placeholder="Auto" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newLessonOrder} onChange={(e) => { setNewLessonOrder(e.target.value); clearFieldError("lessonOrder"); }} />
                    {fieldErrors.lessonOrder && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonOrder}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddLesson(false); resetNewLessonForm(); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveLesson}>Save lesson</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Two-column layout: module/lesson list (left) + question editor (right) ── */}
        {/* Requirements 6.2, 6.4: two-column on ≥1024px, stacked on <768px */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN: Manage modules & lessons ── */}
          <div className="space-y-4">
            {/* Manage Modules */}
            {showManageModules && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base">Modules</CardTitle>
                  <CardDescription>Drag to reorder. Click Edit to modify.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {(modules || []).map((module: any) =>
                    editingModuleId === module._id ? (
                      <div key={module._id} className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <p className="text-sm font-semibold text-slate-800">Edit module</p>
                          <Button variant="ghost" size="sm" onClick={resetNewModuleForm}>Cancel</Button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Module code</label>
                              <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newModuleCode} onChange={(e) => { setNewModuleCode(e.target.value); clearFieldError("moduleCode"); }} />
                              {fieldErrors.moduleCode && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleCode}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Module title</label>
                              <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newModuleTitle} onChange={(e) => { setNewModuleTitle(e.target.value); clearFieldError("moduleTitle"); }} />
                              {fieldErrors.moduleTitle && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleTitle}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">Description</label>
                            <textarea rows={2} className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={newModuleDescription} onChange={(e) => { setNewModuleDescription(e.target.value); clearFieldError("moduleDescription"); }} />
                            {fieldErrors.moduleDescription && <p className="text-red-500 text-xs mt-1">{fieldErrors.moduleDescription}</p>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Color theme</label>
                              <div className="flex flex-wrap gap-2">
                                {["indigo","pink","blue","emerald","amber","violet","rose"].map((c) => (
                                  <button key={c} type="button" onClick={() => setNewModuleColor(c)}
                                    className={`h-8 px-2 rounded-md border text-xs font-medium transition-colors ${newModuleColor === c ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                                    {c}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Icon</label>
                              <div className="flex gap-2">
                                {[{ key: "bookOpen", label: "Book" }, { key: "beaker", label: "Beaker" }, { key: "atom", label: "Atom" }].map((opt) => (
                                  <button key={opt.key} type="button" onClick={() => setNewModuleIconKey(opt.key as any)}
                                    className={`h-8 px-2 rounded-md border text-xs font-medium transition-colors ${newModuleIconKey === opt.key ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={resetNewModuleForm}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveModule}>Save module</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={module.moduleKey} draggable
                        onDragStart={(e) => { setDraggedModuleId(module._id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragOver={(e) => { e.preventDefault(); setModuleDropTargetId(module._id); }}
                        onDragLeave={() => { if (moduleDropTargetId === module._id) setModuleDropTargetId(null); }}
                        onDrop={async (e) => { e.preventDefault(); await handleDropModule(module._id); setDraggedModuleId(null); setModuleDropTargetId(null); }}
                        onDragEnd={() => { setDraggedModuleId(null); setModuleDropTargetId(null); }}
                        className={`border rounded-md px-4 py-3 flex items-center justify-between gap-4 cursor-move transition-colors ${moduleDropTargetId === module._id ? "border-indigo-300 bg-indigo-50" : "bg-white"}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{module.code} — {module.title}</p>
                          <p className="text-xs text-slate-500 truncate">{module.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100" onClick={() => startEditModule(module)}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteModule(module)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                  {(modules || []).length === 0 && <p className="text-xs text-slate-500 italic">No modules yet.</p>}
                </CardContent>
              </Card>
            )}

            {/* Manage Lessons */}
            {showManageLessons && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base">Lessons</CardTitle>
                  <CardDescription>Drag to reorder. Filtered by selected module.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {filteredLessons.map((lesson: any) =>
                    editingLessonId === lesson._id ? (
                      <div key={lesson._id} className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <p className="text-sm font-semibold text-slate-800">Edit lesson</p>
                          <Button variant="ghost" size="sm" onClick={resetNewLessonForm}>Cancel</Button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Course</label>
                              <div ref={moduleDropdownRef} className="relative">
                                <button type="button" disabled={!modules || modules.length === 0} onClick={() => setModuleDropdownOpen((v) => !v)}
                                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 flex items-center justify-between text-left">
                                  <span className="truncate text-slate-800">
                                    {selectedModuleForNewLesson ? `${selectedModuleForNewLesson.code} — ${selectedModuleForNewLesson.title}` : "Select a module"}
                                  </span>
                                  <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                                </button>
                                {moduleDropdownOpen && modules && modules.length > 0 && (
                                  <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="max-h-48 overflow-y-auto py-1">
                                      {modules.map((m: any) => (
                                        <button key={m.moduleKey} type="button" onClick={() => { setNewLessonSection(m.moduleKey); setModuleDropdownOpen(false); }}
                                          className={`w-full px-3 py-2 text-sm text-left transition-colors ${m.moduleKey === newLessonSection ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"}`}>
                                          <div className="font-medium truncate">{m.code} — {m.title}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Difficulty</label>
                              <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newLessonDifficulty} onChange={(e) => { setNewLessonDifficulty(e.target.value); clearFieldError("lessonDifficulty"); }} />
                              {fieldErrors.lessonDifficulty && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonDifficulty}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">Lesson title</label>
                            <input type="text" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={newLessonTitle} onChange={(e) => { setNewLessonTitle(e.target.value); clearFieldError("lessonTitle"); }} />
                            {fieldErrors.lessonTitle && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonTitle}</p>}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">Description</label>
                            <textarea rows={2} className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={newLessonDescription} onChange={(e) => { setNewLessonDescription(e.target.value); clearFieldError("lessonDescription"); }} />
                            {fieldErrors.lessonDescription && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonDescription}</p>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">XP reward</label>
                              <input type="number" min={1} className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newLessonXpReward} onChange={(e) => { setNewLessonXpReward(e.target.value); clearFieldError("lessonXp"); }} />
                              {fieldErrors.lessonXp && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonXp}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-700">Order <span className="font-normal text-slate-500">(optional)</span></label>
                              <input type="number" min={1} placeholder="Auto" className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newLessonOrder} onChange={(e) => { setNewLessonOrder(e.target.value); clearFieldError("lessonOrder"); }} />
                              {fieldErrors.lessonOrder && <p className="text-red-500 text-xs mt-1">{fieldErrors.lessonOrder}</p>}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={resetNewLessonForm}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveLesson}>Save lesson</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={lesson._id} draggable
                        onDragStart={(e) => { setDraggedLessonId(lesson._id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragOver={(e) => { e.preventDefault(); setLessonDropTargetId(lesson._id); }}
                        onDragLeave={() => { if (lessonDropTargetId === lesson._id) setLessonDropTargetId(null); }}
                        onDrop={async (e) => { e.preventDefault(); await handleDropLesson(lesson._id); setDraggedLessonId(null); setLessonDropTargetId(null); }}
                        onDragEnd={() => { setDraggedLessonId(null); setLessonDropTargetId(null); }}
                        className={`border rounded-md px-4 py-3 flex items-center justify-between gap-4 cursor-move transition-colors ${lessonDropTargetId === lesson._id ? "border-indigo-300 bg-indigo-50" : "bg-white"}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{lesson.title}</p>
                          <p className="text-xs text-slate-500 truncate">{lesson.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100" onClick={() => startEditLesson(lesson)}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteLesson(lesson)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                  {filteredLessons.length === 0 && <p className="text-xs text-slate-500 italic">No lessons for this module.</p>}
                </CardContent>
              </Card>
            )}

            {/* Selected lesson info */}
            {selectedLesson && !showManageModules && !showManageLessons && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{selectedLesson.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{selectedLesson.description}</p>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span>Difficulty: <span className="font-semibold">{selectedLesson.difficulty}</span></span>
                      <span>XP: <span className="font-semibold">{selectedLesson.xpReward}</span></span>
                      <span>Questions: <span className="font-semibold">{selectedLesson.questions?.length || 0}</span></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedLesson && !showManageModules && !showManageLessons && (
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500">
                    {lessons && lessons.length === 0
                      ? "No lessons found. Use the tools above to create content."
                      : "Select a lesson to view its question set."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN: Question editor ── */}
          <div>
            {selectedLesson && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Question set</CardTitle>
                      <CardDescription>{selectedLesson.title}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={startAddNewQuestion}>
                      <PlusCircle className="w-4 h-4 mr-1" /> Add question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {selectedLesson.questions?.length > 0 ? (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {selectedLesson.questions.map((q: any, idx: number) => (
                        <div key={idx} className="border rounded-md p-3 bg-white">
                          <div className="flex justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500 mb-1">Q{idx + 1} · {q.type === "dragdrop" ? "Drag & Drop" : q.type === "fillblank" ? "Fill in Blank" : "MCQ"}</p>
                              <p className="text-sm font-medium text-slate-800 truncate">{q.question}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {q.type === "dragdrop" ? <span className="italic">Drag & Drop</span>
                                  : q.type === "fillblank" ? <>Correct: <span className="font-semibold">{q.correctAnswer ?? "Not set"}</span></>
                                  : <>Correct: <span className="font-semibold">{q.options?.[q.correct] ?? "Not set"}</span></>}
                              </p>
                            </div>
                            <div className="flex items-start gap-2 shrink-0">
                              <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100" onClick={() => startEditQuestion(idx)}>
                                <Pencil className="w-4 h-4 mr-1" /> Edit
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteQuestion(idx)}>
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2">This lesson has no questions yet.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Glossary Modal ── */}
        {showGlossaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onPointerDown={(e) => { if (e.target === e.currentTarget) { setShowGlossaryModal(false); resetGlossaryForm(); } }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <h2 className="text-sm font-semibold text-slate-800">Manage Glossary</h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowGlossaryModal(false); resetGlossaryForm(); }}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Add / edit form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">{editingGlossaryId ? "Edit Term" : "Add New Term"}</h3>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Term</label>
                    <input type="text" placeholder="e.g. polymer"
                      className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newGlossaryTerm} onChange={(e) => { setNewGlossaryTerm(e.target.value); clearFieldError("glossaryTerm"); }} />
                    {fieldErrors.glossaryTerm && <p className="text-red-500 text-xs mt-1">{fieldErrors.glossaryTerm}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Definition</label>
                    <textarea rows={4} placeholder="A large molecule..."
                      className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newGlossaryDef} onChange={(e) => { setNewGlossaryDef(e.target.value); clearFieldError("glossaryDef"); }} />
                    {fieldErrors.glossaryDef && <p className="text-red-500 text-xs mt-1">{fieldErrors.glossaryDef}</p>}
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingGlossaryId && (
                      <Button variant="outline" size="sm" onClick={resetGlossaryForm}>Cancel Edit</Button>
                    )}
                    <Button size="sm" onClick={handleSaveGlossaryTerm}>
                      {editingGlossaryId ? "Save Changes" : "Add Term"}
                    </Button>
                  </div>
                </div>
                {/* Existing terms list */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-800">Existing Terms</h3>
                  <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2">
                    {!glossary && <p className="text-xs text-slate-500">Loading...</p>}
                    {glossary?.map((term: any) => (
                      <div key={term._id} className="border rounded-md px-3 py-2 flex items-center justify-between gap-4 bg-slate-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{term.term}</p>
                          <p className="text-xs text-slate-500 truncate">{term.definition}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:bg-slate-100" onClick={() => startEditGlossaryTerm(term)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDeleteGlossaryTerm(term)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {glossary?.length === 0 && <p className="text-xs text-slate-500 italic">No glossary terms found.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Question Add/Edit Modal ── */}
        {showQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onPointerDown={(e) => { if (e.target === e.currentTarget) { setShowQuestionModal(false); setEditingIndex(null); resetQuestionForm(); } }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <h2 className="text-sm font-semibold text-slate-800">
                  {editingIndex === null ? "Add a new question" : `Edit question ${editingIndex + 1}`}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowQuestionModal(false); setEditingIndex(null); resetQuestionForm(); }}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-y-auto p-4">
                <div className="space-y-3">
                  {/* Question type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Question type</label>
                    <select className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={questionType} onChange={(e) => { setQuestionType(e.target.value as "mcq" | "dragdrop" | "fillblank"); setFieldErrors({}); }}>
                      <option value="mcq">Multiple Choice</option>
                      <option value="dragdrop">Drag &amp; Drop</option>
                      <option value="fillblank">Fill in the Blank</option>
                    </select>
                  </div>

                  {/* Question text */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      {questionType === "fillblank" ? 'Question with blank (use "___")' : "Question text"}
                    </label>
                    <textarea rows={3}
                      className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={questionText}
                      placeholder={questionType === "fillblank" ? "A polymer is a large ___ made of repeating subunits." : ""}
                      onChange={(e) => { setQuestionText(e.target.value); clearFieldError("questionText"); }} />
                    {fieldErrors.questionText && <p className="text-red-500 text-xs mt-1">{fieldErrors.questionText}</p>}
                  </div>

                  {/* Fill-in-the-blank correct answer */}
                  {questionType === "fillblank" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">Correct Answer</label>
                      <input type="text" placeholder="molecule"
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={fillCorrectAnswer} onChange={(e) => { setFillCorrectAnswer(e.target.value); clearFieldError("fillAnswer"); }} />
                      {fieldErrors.fillAnswer && <p className="text-red-500 text-xs mt-1">{fieldErrors.fillAnswer}</p>}
                    </div>
                  )}

                  {/* MCQ options */}
                  {questionType === "mcq" && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-700">Answer options (one per line)</label>
                        <textarea rows={4}
                          className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={optionsText} onChange={(e) => { setOptionsText(e.target.value); clearFieldError("options"); }} />
                        {fieldErrors.options && <p className="text-red-500 text-xs mt-1">{fieldErrors.options}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-700">
                          Correct option number <span className="font-normal text-slate-500">(1 = first line)</span>
                        </label>
                        <input type="number" min={1}
                          className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={correctOptionNumber} onChange={(e) => { setCorrectOptionNumber(e.target.value); clearFieldError("correctOption"); }} />
                        {fieldErrors.correctOption && <p className="text-red-500 text-xs mt-1">{fieldErrors.correctOption}</p>}
                      </div>
                    </>
                  )}

                  {/* Drag & drop builder */}
                  {questionType === "dragdrop" && (
                    <div className="border rounded-md p-3 bg-slate-50 space-y-4">
                      {/* Answer bank */}
                      <div>
                        <label className="text-xs font-medium text-slate-700">Answer bank</label>
                        <div className="flex gap-2 mt-1">
                          <input type="text" placeholder="Add answer and press Enter"
                            className="flex-1 rounded-md border border-slate-200 text-sm px-2 h-8"
                            value={ddBankInput} onChange={(e) => setDdBankInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && ddBankInput.trim()) {
                                setDdAnswerBank([...ddAnswerBank, { id: crypto.randomUUID(), text: ddBankInput.trim() }]);
                                setDdBankInput("");
                                e.preventDefault();
                              }
                            }} />
                          <button type="button" className="px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-sm"
                            onClick={() => { if (ddBankInput.trim()) { setDdAnswerBank([...ddAnswerBank, { id: crypto.randomUUID(), text: ddBankInput.trim() }]); setDdBankInput(""); } }}>
                            Add
                          </button>
                        </div>
                        {fieldErrors.ddBank && <p className="text-red-500 text-xs mt-1">{fieldErrors.ddBank}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {ddAnswerBank.map((ans) => (
                            <div key={ans.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", ans.id)}
                              className="px-2 py-1 bg-white border rounded shadow text-sm cursor-move flex items-center">
                              {ans.text}
                              <button type="button" className="ml-2 text-xs text-red-500 hover:text-red-700"
                                onClick={() => setDdAnswerBank(ddAnswerBank.filter((a) => a.id !== ans.id))}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Sections */}
                      <div>
                        <label className="text-xs font-medium text-slate-700">Sections</label>
                        <div className="flex flex-wrap gap-2 mt-1 mb-2">
                          {ddSections.map((section, sIdx) => (
                            <input key={`sec-input-${sIdx}`} type="text"
                              className="rounded-md border border-slate-200 text-sm px-2 h-8 w-32"
                              value={section.name}
                              onChange={(e) => { const s = [...ddSections]; s[sIdx].name = e.target.value; setDdSections(s); }} />
                          ))}
                          <button type="button" className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm"
                            onClick={() => setDdSections([...ddSections, { name: `Section ${ddSections.length + 1}`, answers: [] }])}>
                            + Add Section
                          </button>
                        </div>
                        {fieldErrors.ddSections && <p className="text-red-500 text-xs mt-1">{fieldErrors.ddSections}</p>}
                        <div className="grid grid-cols-2 gap-4">
                          {ddSections.map((section, sIdx) => (
                            <div key={`sec-drop-${sIdx}`} className="bg-white border rounded p-2 min-h-[80px]"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                const draggedId = e.dataTransfer.getData("text/plain");
                                if (!draggedId) return;
                                let draggedItem = ddAnswerBank.find((a) => a.id === draggedId);
                                if (!draggedItem) {
                                  for (const sec of ddSections) {
                                    const found = sec.answers.find((a) => a.id === draggedId);
                                    if (found) { draggedItem = found; break; }
                                  }
                                }
                                if (!draggedItem) return;
                                setDdAnswerBank((prev) => prev.filter((a) => a.id !== draggedId));
                                setDdSections(ddSections.map((sec, i) => {
                                  const filtered = sec.answers.filter((a) => a.id !== draggedId);
                                  return i === sIdx ? { ...sec, answers: [...filtered, draggedItem!] } : { ...sec, answers: filtered };
                                }));
                              }}>
                              <div className="font-semibold text-xs mb-1 border-b pb-1">{section.name}</div>
                              {section.answers.length === 0 && <div className="text-slate-400 text-xs italic mt-2">Drop answers here</div>}
                              {section.answers.map((ans) => (
                                <div key={ans.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", ans.id)}
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded shadow-sm text-sm flex items-center justify-between mt-2 cursor-move">
                                  <span className="truncate mr-2">{ans.text}</span>
                                  <button type="button" className="text-xs text-red-500 hover:text-red-700 shrink-0"
                                    onClick={() => {
                                      const s = [...ddSections];
                                      s[sIdx].answers = s[sIdx].answers.filter((a) => a.id !== ans.id);
                                      setDdSections(s);
                                      setDdAnswerBank([...ddAnswerBank, ans]);
                                    }}>✕</button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image upload */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Upload image</label>
                    <input id="question-image-upload" type="file" accept="image/*" className="sr-only"
                      ref={imageInputRef} disabled={isUploading} onChange={handleImageUpload} />
                    <button type="button" onClick={() => imageInputRef.current?.click()}
                      className={`inline-flex w-fit items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
                      Choose image to upload
                    </button>
                    <p className="text-[11px] text-slate-500">{imageFileName || "No file selected"}</p>
                    {previewUrl && (
                      <div className="mt-2 w-full h-48 bg-slate-50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2"
                          onError={() => { if (imageUrl) setBrokenLinks((prev) => new Set(prev).add(imageUrl)); }} />
                        <button type="button" onClick={() => { setImageUrl(""); setImageStorageId(""); setImageFileName(""); }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-sm">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Explanation</label>
                    <textarea rows={3}
                      className="w-full rounded-md border border-slate-200 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 mt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={() => { setShowQuestionModal(false); setEditingIndex(null); resetQuestionForm(); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveQuestion} disabled={isUploading}>
                      {isUploading ? "Uploading image..." : editingIndex === null ? "Add question to set" : "Save changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Toast stack ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
