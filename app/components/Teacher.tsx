"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
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
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Helper to format ISO date strings or timestamps in a friendly way
function formatDateTime(dt: string | number | undefined | null): string {
  if (!dt) return "-";
  const date =
    typeof dt === "string" || typeof dt === "number" ? new Date(dt) : null;
  if (!date || isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Type for Drag & Drop items
type DragDropItem = { id: string; text: string };

export const TeacherDashboard = ({ onClose }: { onClose: () => void }) => {
  const stats = useQuery(api.teachers.getClassStats);
  const lessons = useQuery(api.lessons.getAll);
  const modules = useQuery(api.modules.getAll);
  const ensureDefaultModules = useMutation(api.modules.ensureDefaultModules);
  const removeStudent = useMutation(api.teachers.removeStudent);
  const resetAllStudentProgress = useMutation(
    api.teachers.resetAllStudentProgress,
  );
  const updateQuestions = useMutation(api.lessons.updateQuestions);
  const createLesson = useMutation(api.lessons.createLesson);
  const updateLesson = useMutation(api.lessons.updateLesson);
  const deleteLesson = useMutation(api.lessons.deleteLesson);
  const reorderLessons = useMutation(api.lessons.reorderLessons);
  const createModule = useMutation(api.modules.createModule);
  const updateModule = useMutation(api.modules.updateModule);
  const deleteModule = useMutation(api.modules.deleteModule);
  const reorderModules = useMutation(api.modules.reorderModules);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const lessonDropdownRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [showAddModule, setShowAddModule] = useState(false);
  const [showManageModules, setShowManageModules] = useState(false);
  const [newModuleCode, setNewModuleCode] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleColor, setNewModuleColor] = useState("indigo");
  const [newModuleIconKey, setNewModuleIconKey] = useState<
    "bookOpen" | "beaker" | "atom"
  >("atom");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showManageLessons, setShowManageLessons] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("qxu5031");
  const [lessonModuleFilter, setLessonModuleFilter] = useState<string>("all");
  const [newLessonDifficulty, setNewLessonDifficulty] = useState("Beginner");
  const [newLessonXpReward, setNewLessonXpReward] = useState("100");
  const [newLessonOrder, setNewLessonOrder] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const moduleDropdownRef = useRef<HTMLDivElement | null>(null);
  const [moduleFilterDropdownOpen, setModuleFilterDropdownOpen] =
    useState(false);
  const moduleFilterDropdownRef = useRef<HTMLDivElement | null>(null);

  // --- Question Editing State ---
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<"mcq" | "dragdrop">("mcq");
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOptionNumber, setCorrectOptionNumber] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageStorageId, setImageStorageId] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());

  // --- Drag & Drop Specific State ---
  const [ddAnswerBank, setDdAnswerBank] = useState<DragDropItem[]>([]);
  const [ddSections, setDdSections] = useState<
    Array<{ name: string; answers: DragDropItem[] }>
  >([
    { name: "Section 1", answers: [] },
    { name: "Section 2", answers: [] },
  ]);
  const [ddBankInput, setDdBankInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<
    string | null
  >(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [studentReportAttemptFilter, setStudentReportAttemptFilter] =
    useState<string>("all");
  const [expandedReportLessons, setExpandedReportLessons] = useState<
    Set<string>
  >(new Set());
  const [responseModalQuestionIndex, setResponseModalQuestionIndex] = useState<
    number | null
  >(null);

  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [moduleDropTargetId, setModuleDropTargetId] = useState<string | null>(
    null,
  );
  const [lessonDropTargetId, setLessonDropTargetId] = useState<string | null>(
    null,
  );

  // --- Queries & Memos ---
  const studentAttempts = useQuery(
    api.lessonAttempts.getByUser,
    selectedStudentUserId ? { userId: selectedStudentUserId } : "skip",
  );

  const selectedLessonAttempts = useQuery(
    api.lessonAttempts.getByLesson,
    selectedLessonId ? { lessonId: selectedLessonId as Id<"lessons"> } : "skip",
  );

  const storagePreviewUrl = useQuery(
    api.uploads.getFileUrl,
    imageStorageId ? { storageId: imageStorageId as Id<"_storage"> } : "skip",
  );

  const previewUrl = useMemo(() => {
    if (storagePreviewUrl) return storagePreviewUrl;
    const raw = imageUrl.trim();
    if (!raw || brokenLinks.has(raw)) return "";
    return raw;
  }, [imageUrl, storagePreviewUrl, brokenLinks]);

  const reportLessons = useMemo(() => {
    if (!studentAttempts || !lessons) return [];

    const attemptsByLesson = new Map<string, any[]>();
    for (const attempt of studentAttempts) {
      const lessonKey = String(attempt.lessonId);
      const list = attemptsByLesson.get(lessonKey) || [];
      list.push(attempt);
      attemptsByLesson.set(lessonKey, list);
    }

    const lessonMap = new Map<string, any>();
    for (const lesson of lessons) {
      lessonMap.set(String(lesson._id), lesson);
    }

    const rows: Array<{
      lesson: any;
      latestAttempt: any;
      attemptCount: number;
    }> = [];

    attemptsByLesson.forEach((attempts, lessonId) => {
      const lesson = lessonMap.get(lessonId);
      if (!lesson) return;
      const sorted = attempts.slice().sort((a, b) => {
        const aTime = a.updatedAt || a.startedAt || "";
        const bTime = b.updatedAt || b.startedAt || "";
        return bTime.localeCompare(aTime);
      });
      rows.push({
        lesson,
        latestAttempt: sorted[0],
        attemptCount: sorted.length,
      });
    });

    return rows.sort((a, b) => (a.lesson.order || 0) - (b.lesson.order || 0));
  }, [studentAttempts, lessons]);

  const reportAttemptOptions = useMemo(() => {
    if (!studentAttempts || !lessons) return [];

    const lessonMap = new Map<string, any>();
    for (const lesson of lessons) {
      lessonMap.set(String(lesson._id), lesson);
    }

    return studentAttempts
      .map((attempt: any) => {
        const lesson = lessonMap.get(String(attempt.lessonId));
        if (!lesson) return null;
        return { attempt, lesson };
      })
      .filter((value): value is { attempt: any; lesson: any } => value !== null)
      .sort((a, b) => {
        const aTime =
          a.attempt.updatedAt ||
          a.attempt.completedAt ||
          a.attempt.startedAt ||
          "";
        const bTime =
          b.attempt.updatedAt ||
          b.attempt.completedAt ||
          b.attempt.startedAt ||
          "";
        return bTime.localeCompare(aTime);
      });
  }, [studentAttempts, lessons]);

  const displayedStudentReportLessons = useMemo(() => {
    if (studentReportAttemptFilter === "all") return reportLessons;

    const selected = reportAttemptOptions.find(
      ({ attempt }) => String(attempt._id) === studentReportAttemptFilter,
    );
    if (!selected) return [];

    const matchingLesson = reportLessons.find(
      ({ lesson }) => String(lesson._id) === String(selected.lesson._id),
    );

    return [
      {
        lesson: selected.lesson,
        latestAttempt: selected.attempt,
        attemptCount: matchingLesson?.attemptCount || 1,
      },
    ];
  }, [reportLessons, reportAttemptOptions, studentReportAttemptFilter]);

  const studentNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of stats?.leaderboard || []) {
      map.set(student.userId, student.userName || "Anonymous User");
    }
    return map;
  }, [stats]);

  const lessonResponsesByQuestion = useMemo(() => {
    const map = new Map<
      number,
      Array<{
        userId: string;
        selectedOption: number | null;
        placedSections?: any;
        isCorrect: boolean;
        submittedAt: string;
        timeSpentMs?: number;
      }>
    >();

    if (!selectedLessonAttempts) return map;

    const sortedAttempts = selectedLessonAttempts.slice().sort((a, b) => {
      const aTime = a.completedAt || a.updatedAt || a.startedAt || "";
      const bTime = b.completedAt || b.updatedAt || b.startedAt || "";
      return bTime.localeCompare(aTime);
    });

    for (const attempt of sortedAttempts) {
      const submittedAt =
        attempt.completedAt || attempt.updatedAt || attempt.startedAt || "";
      for (const ans of attempt.answers || []) {
        const list = map.get(ans.questionIndex) || [];
        list.push({
          userId: attempt.userId,
          selectedOption: ans.selectedOption ?? null,
          placedSections: ans.placedSections,
          isCorrect: ans.isCorrect,
          submittedAt,
          timeSpentMs: ans.timeSpentMs,
        });
        map.set(ans.questionIndex, list);
      }
    }

    return map;
  }, [selectedLessonAttempts]);

  const filteredLessons = useMemo(() => {
    if (!lessons) return [];
    if (lessonModuleFilter === "all") return lessons;
    return lessons.filter(
      (lesson: any) => (lesson.section || "") === lessonModuleFilter,
    );
  }, [lessons, lessonModuleFilter]);

  // --- Utility Functions ---
  const formatResponseTimestamp = (timestamp: string) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatResponseName = (userId: string) => {
    const baseName = (
      studentNameByUserId.get(userId) || "Anonymous User"
    ).trim();
    const shortId = userId ? `${userId.slice(0, 8)}...` : "unknown";
    return `${baseName} (${shortId})`;
  };

  const formatDurationMs = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      return "-";
    }
    const totalSeconds = Math.round(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  // --- Effects ---
  useEffect(() => {
    void ensureDefaultModules().catch((err) => {
      console.error("Failed to ensure default modules:", err);
    });
  }, [ensureDefaultModules]);

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;
    if (filteredLessons.length === 0) {
      setSelectedLessonId(null);
      return;
    }
    if (!selectedLessonId) {
      setSelectedLessonId(filteredLessons[0]._id);
      return;
    }
    const stillVisible = filteredLessons.some(
      (lesson: any) => lesson._id === selectedLessonId,
    );
    if (!stillVisible) {
      setSelectedLessonId(filteredLessons[0]._id);
    }
  }, [lessons, filteredLessons, selectedLessonId]);

  useEffect(() => {
    setResponseModalQuestionIndex(null);
  }, [selectedLessonId]);

  useEffect(() => {
    setStudentReportAttemptFilter("all");
    setExpandedReportLessons(new Set());
  }, [selectedStudentUserId]);

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    if (!newLessonSection) {
      setNewLessonSection(modules[0].moduleKey);
    }
  }, [modules, newLessonSection]);

  // Click outside handlers for dropdowns
  useEffect(() => {
    if (!lessonDropdownOpen) return;
    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (lessonDropdownRef.current?.contains(target)) return;
      setLessonDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLessonDropdownOpen(false);
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
      if (e.key === "Escape") setModuleDropdownOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moduleDropdownOpen]);

  useEffect(() => {
    if (!moduleFilterDropdownOpen) return;
    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (moduleFilterDropdownRef.current?.contains(target)) return;
      setModuleFilterDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModuleFilterDropdownOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moduleFilterDropdownOpen]);

  // --- Handlers ---
  const selectedLesson =
    lessons?.find((lesson: any) => lesson._id === selectedLessonId) ?? null;
  const selectedModuleForNewLesson =
    modules?.find((m: any) => m.moduleKey === newLessonSection) ?? null;

  const resetNewModuleForm = () => {
    setEditingModuleId(null);
    setNewModuleCode("");
    setNewModuleTitle("");
    setNewModuleDescription("");
    setNewModuleColor("indigo");
    setNewModuleIconKey("atom");
  };

  const resetNewLessonForm = () => {
    setEditingLessonId(null);
    setNewLessonTitle("");
    setNewLessonDescription("");
    setNewLessonSection(modules?.[0]?.moduleKey || "qxu5031");
    setNewLessonDifficulty("Beginner");
    setNewLessonXpReward("100");
    setNewLessonOrder("");
  };

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
  };

  const handleSaveModule = async () => {
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
      if (editingModuleId) {
        const res: any = await updateModule({
          id: editingModuleId as Id<"modules">,
          code,
          title,
          description,
          color: newModuleColor,
          iconKey: newModuleIconKey,
        });
        if (res?.moduleKey) setNewLessonSection(res.moduleKey);
      } else {
        const res: any = await createModule({
          code,
          title,
          description,
          color: newModuleColor,
          iconKey: newModuleIconKey,
        });
        if (res?.moduleKey) setNewLessonSection(res.moduleKey);
      }
      setShowAddModule(false);
      resetNewModuleForm();
      alert(editingModuleId ? "Module updated." : "Module created.");
    } catch (e: any) {
      alert(e?.message || "Failed to save module.");
    }
  };

  const handleDeleteModule = async (module: any) => {
    if (!module?._id) return;
    if (!window.confirm(`Delete module "${module.code} — ${module.title}"?`))
      return;
    try {
      await deleteModule({ id: module._id });
      if (editingModuleId === module._id) resetNewModuleForm();
      alert("Module deleted.");
    } catch (e: any) {
      alert(e?.message || "Failed to delete module.");
    }
  };

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
  };

  const handleSaveLesson = async () => {
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

    if (editingLessonId) {
      await updateLesson({
        id: editingLessonId as Id<"lessons">,
        title,
        description,
        difficulty,
        xpReward,
        section: newLessonSection || undefined,
        order,
      });
      setSelectedLessonId(editingLessonId);
    } else {
      const res: any = await createLesson({
        title,
        description,
        difficulty,
        xpReward,
        section: newLessonSection || undefined,
        order,
      });
      if (res?.id) setSelectedLessonId(res.id);
    }

    setLessonDropdownOpen(false);
    setShowAddLesson(false);
    setEditingIndex(null);
    resetForm();
    resetNewLessonForm();
    alert(editingLessonId ? "Lesson updated." : "Lesson created.");
  };

  const handleDeleteLesson = async (lesson: any) => {
    if (
      !window.confirm(
        `Delete lesson "${lesson.title}"? This also deletes its question images.`,
      )
    )
      return;
    await deleteLesson({ id: lesson._id });

    if (selectedLessonId === lesson._id) {
      const nextLesson = (lessons || []).find((l: any) => l._id !== lesson._id);
      setSelectedLessonId(nextLesson?._id || null);
      setEditingIndex(null);
      resetForm();
    }
    if (editingLessonId === lesson._id) {
      resetNewLessonForm();
      setShowAddLesson(false);
    }
    alert("Lesson deleted.");
  };

  const reorderById = <T extends { _id: string }>(
    list: T[],
    draggedId: string,
    targetId: string,
  ) => {
    if (draggedId === targetId) return list;
    const draggedIndex = list.findIndex((item) => item._id === draggedId);
    const targetIndex = list.findIndex((item) => item._id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return list;

    const next = [...list];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const handleDropModule = async (targetModuleId: string) => {
    if (!draggedModuleId || !modules) return;
    const reordered = reorderById(
      modules as any[],
      draggedModuleId,
      targetModuleId,
    );
    const reorderedIds = reordered
      .map((item) => item._id)
      .filter(Boolean) as Id<"modules">[];
    if (reorderedIds.length === 0) return;
    await reorderModules({ moduleIds: reorderedIds });
  };

  const handleDropLesson = async (targetLessonId: string) => {
    if (!draggedLessonId || !lessons) return;
    const reordered = reorderById(
      lessons as any[],
      draggedLessonId,
      targetLessonId,
    );
    const reorderedIds = reordered
      .map((item) => item._id)
      .filter(Boolean) as Id<"lessons">[];
    if (reorderedIds.length === 0) return;
    await reorderLessons({ lessonIds: reorderedIds });
  };

  const resetForm = () => {
    setQuestionType("mcq");
    setQuestionText("");
    setOptionsText("");
    setCorrectOptionNumber("");
    setExplanation("");
    setImageUrl("");
    setImageStorageId("");
    setImageFileName("");
    setDdAnswerBank([]);
    setDdSections([
      { name: "Section 1", answers: [] },
      { name: "Section 2", answers: [] },
    ]);
  };

  const startAddNewQuestion = () => {
    setEditingIndex(null);
    resetForm();
  };

  const startEditQuestion = (index: number) => {
    if (!selectedLesson) return;
    const q = selectedLesson.questions[index];
    setEditingIndex(index);
    setQuestionType(q.type === "dragdrop" ? "dragdrop" : "mcq");
    setQuestionText(q.question || "");
    setOptionsText((q.options || []).join("\n"));
    setCorrectOptionNumber(
      typeof q.correct === "number" ? String(q.correct + 1) : "1",
    );
    setExplanation(q.explanation || "");
    setImageUrl(q.imageUrl || "");
    setImageStorageId(q.imageStorageId || "");
    setImageFileName("");

    if (q.type === "dragdrop") {
      const ensureId = (text: string): DragDropItem => ({
        id: crypto.randomUUID(),
        text,
      });
      setDdAnswerBank((q.answerBank || []).map(ensureId));
      if (q.sections && q.sections.length > 0) {
        setDdSections(
          q.sections.map((s: any) => ({
            name: s.name,
            answers: (s.answers || []).map(ensureId),
          })),
        );
      } else {
        setDdSections([
          { name: "Section 1", answers: [] },
          { name: "Section 2", answers: [] },
        ]);
      }
    } else {
      setDdAnswerBank([]);
      setDdSections([
        { name: "Section 1", answers: [] },
        { name: "Section 2", answers: [] },
      ]);
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
    reader.onerror = () => {
      setIsUploading(false);
      alert("Could not read the file. Please try a different image.");
    };
    reader.onload = () => {
      const imgElement = new Image();
      imgElement.crossOrigin = "anonymous";
      imgElement.onerror = () => {
        setIsUploading(false);
        alert("Could not load the image. Please try a different file.");
      };
      imgElement.onload = () => {
        processAndUpload(imgElement, file.type).catch((err) => {
          console.error("Upload error:", err);
          setIsUploading(false);
          alert(
            "Could not process image. Try downloading the file and uploading it directly.",
          );
        });
      };
      const result = reader.result;
      if (typeof result === "string") {
        imgElement.src = result;
      } else {
        setIsUploading(false);
        alert("Could not read the file. Please try a different image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const processAndUpload = async (
    image: HTMLImageElement,
    _fileType: string,
  ) => {
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

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.9),
    );
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
      alert("Image uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedLesson) return;

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      alert("Question text is required.");
      return;
    }

    let newQuestion: any = { type: questionType, question: trimmedQuestion };
    if (questionType === "mcq") {
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
      newQuestion = {
        ...newQuestion,
        options,
        correct: correctNum - 1,
        explanation: explanation.trim() || "No explanation provided.",
      };
    } else if (questionType === "dragdrop") {
      if (
        ddAnswerBank.length === 0 &&
        ddSections.every((s) => s.answers.length === 0)
      ) {
        alert("Please add at least one answer to the bank or a section.");
        return;
      }
      if (ddSections.length < 2) {
        alert("Please provide at least two sections.");
        return;
      }
      newQuestion = {
        ...newQuestion,
        answerBank: ddAnswerBank.map((a) => a.text),
        sections: ddSections.map((s) => ({
          name: s.name,
          answers: s.answers.map((a) => a.text),
        })),
        explanation: explanation.trim() || "No explanation provided.",
      };
    }

    const trimmedImage = imageUrl.trim();
    if (trimmedImage) newQuestion.imageUrl = trimmedImage;

    const trimmedStorageId = imageStorageId.trim();
    if (trimmedStorageId) newQuestion.imageStorageId = trimmedStorageId;

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
    if (
      !window.confirm(
        `Delete question ${index + 1} from "${selectedLesson.title}"?`,
      )
    )
      return;

    const existing = selectedLesson.questions || [];
    const updatedQuestions = existing.filter(
      (_q: any, idx: number) => idx !== index,
    );

    await updateQuestions({
      lessonId: selectedLesson._id,
      questions: updatedQuestions,
    });

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

  const handleDelete = async (studentId: any, userId: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove Student ${userId}? \n\nThis will permanently delete their progress and XP.`,
      )
    ) {
      await removeStudent({ id: studentId });
    }
  };

  const handleResetAllStudentProgress = async () => {
    if (
      !window.confirm(
        "Reset all student progress for everyone? This will permanently remove XP, streaks, completion progress, and lesson attempts.",
      )
    )
      return;
    const confirmationText = window.prompt(
      "Type RESET to confirm deleting all student progress:",
      "",
    );
    if ((confirmationText || "").trim().toUpperCase() !== "RESET") {
      alert("Reset cancelled. Confirmation text did not match.");
      return;
    }
    await resetAllStudentProgress({});
    setSelectedStudentUserId(null);
    setSelectedStudentName("");
    alert("All student progress has been reset.");
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
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            Professor's Dashboard
          </h1>
          <p className="text-slate-500">Overview of Student Performance</p>
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
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Search student..."
                    className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAllStudentProgress}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Reset all progress
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
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
                  const fullName = student.userName || "Anonymous";
                  const nameParts = fullName.split(" ");
                  const firstName = nameParts[0];
                  const lastName = nameParts.slice(1).join(" ") || "-";
                  const isSelectedStudent =
                    selectedStudentUserId === student.userId;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentUserId(student.userId);
                        setSelectedStudentName(fullName);
                      }}
                      className={`bg-white border-b hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelectedStudent ? "bg-indigo-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {firstName}
                      </td>
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
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(student.id, fullName);
                          }}
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

        {/* Student Report Modal */}
        {selectedStudentUserId &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedStudentUserId(null);
                  setSelectedStudentName("");
                }
              }}
            >
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Student Report
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedStudentName
                        ? `${selectedStudentName} · Latest attempt per lesson`
                        : "Latest attempt per lesson"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudentUserId(null);
                      setSelectedStudentName("");
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4">
                  {!studentAttempts && (
                    <p className="text-sm text-slate-500">Loading report...</p>
                  )}
                  {studentAttempts && reportLessons.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No attempted lessons yet.
                    </p>
                  )}
                  {studentAttempts && reportLessons.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <label className="text-xs font-medium text-slate-700">
                          Filter report by attempt
                        </label>
                        <select
                          value={studentReportAttemptFilter}
                          onChange={(e) => {
                            setStudentReportAttemptFilter(e.target.value);
                            setExpandedReportLessons(new Set());
                          }}
                          className="h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:w-[320px]"
                        >
                          <option value="all">Latest attempt per lesson</option>
                          {reportAttemptOptions.map(({ lesson, attempt }) => {
                            const attemptTime =
                              attempt.updatedAt ||
                              attempt.completedAt ||
                              attempt.startedAt ||
                              "";
                            return (
                              <option
                                key={String(attempt._id)}
                                value={String(attempt._id)}
                              >
                                {lesson.title} -{" "}
                                {formatResponseTimestamp(attemptTime)}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {displayedStudentReportLessons.length === 0 && (
                        <p className="text-sm text-slate-500">
                          No report found for the selected attempt.
                        </p>
                      )}

                      {displayedStudentReportLessons.map(
                        ({ lesson, latestAttempt, attemptCount }) => {
                          const answerMap = new Map<number, any>();
                          for (const ans of latestAttempt.answers || []) {
                            answerMap.set(ans.questionIndex, ans);
                          }

                          const totalQuestions =
                            typeof latestAttempt.totalQuestions === "number"
                              ? latestAttempt.totalQuestions
                              : lesson.questions?.length || 0;
                          const answeredCount =
                            typeof latestAttempt.answeredCount === "number"
                              ? latestAttempt.answeredCount
                              : (latestAttempt.answers || []).length;
                          const completionPercent =
                            typeof latestAttempt.completionPercent === "number"
                              ? latestAttempt.completionPercent
                              : totalQuestions > 0
                                ? Math.round(
                                    (answeredCount / totalQuestions) * 100,
                                  )
                                : 0;
                          const totalTimeMs =
                            typeof latestAttempt.totalTimeMs === "number"
                              ? latestAttempt.totalTimeMs
                              : (latestAttempt.answers || []).reduce(
                                  (acc: number, ans: any) =>
                                    acc + (ans.timeSpentMs || 0),
                                  0,
                                );

                          const lessonKey = String(lesson._id);
                          const isExpanded =
                            expandedReportLessons.has(lessonKey);
                          const updatedAt =
                            latestAttempt.updatedAt || latestAttempt.startedAt;

                          return (
                            <div
                              key={`${lesson._id}:${latestAttempt._id}`}
                              className="border rounded-lg p-4 bg-white"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {lesson.title}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {lesson.description}
                                  </p>
                                </div>
                                <div className="text-xs text-slate-500 text-right">
                                  <div>Attempts: {attemptCount}</div>
                                  <div>
                                    Progress: {answeredCount}/{totalQuestions} (
                                    {completionPercent}%)
                                  </div>
                                  <div>
                                    Total time: {formatDurationMs(totalTimeMs)}
                                  </div>
                                  <div>
                                    Last updated: {formatDateTime(updatedAt)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedReportLessons((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(lessonKey)) {
                                        next.delete(lessonKey);
                                      } else {
                                        next.add(lessonKey);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  {isExpanded
                                    ? "Hide questions"
                                    : "Show questions"}
                                </Button>
                              </div>

                              {isExpanded && (
                                <div className="mt-3 space-y-3">
                                  {lesson.questions.map(
                                    (q: any, idx: number) => {
                                      const ans = answerMap.get(idx);
                                      const selectedOption =
                                        ans && ans.selectedOption !== null
                                          ? q.options?.[ans.selectedOption]
                                          : "No answer";
                                      const isCorrect = ans
                                        ? ans.isCorrect
                                        : false;

                                      return (
                                        <div
                                          key={idx}
                                          className="rounded-md border border-slate-100 bg-slate-50 p-3"
                                        >
                                          <p className="text-xs text-slate-500">
                                            Q{idx + 1}
                                          </p>
                                          <p className="text-sm font-medium text-slate-800">
                                            {q.question}
                                          </p>

                                          {q.type !== "dragdrop" ? (
                                            <>
                                              <div className="mt-2 text-xs text-slate-600">
                                                <span className="font-semibold">
                                                  Student answer:
                                                </span>{" "}
                                                {selectedOption}
                                              </div>
                                              <div className="mt-1 text-xs text-slate-600">
                                                <span className="font-semibold">
                                                  Correct:
                                                </span>{" "}
                                                {q.options?.[q.correct] ?? "-"}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="mt-2 text-xs text-slate-600">
                                              <span className="font-semibold">
                                                Student answer:
                                              </span>{" "}
                                              Drag & Drop Layout Submitted
                                            </div>
                                          )}

                                          <div className="mt-1 text-xs text-slate-600">
                                            <span className="font-semibold">
                                              Time spent:
                                            </span>{" "}
                                            {formatDurationMs(ans?.timeSpentMs)}
                                          </div>
                                          <div className="mt-2">
                                            {ans ? (
                                              <span
                                                className={`text-xs px-2 py-1 rounded-full font-bold ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                              >
                                                {isCorrect
                                                  ? "Correct"
                                                  : "Incorrect"}
                                              </span>
                                            ) : (
                                              <span className="text-xs px-2 py-1 rounded-full font-bold bg-slate-200 text-slate-600">
                                                Not answered
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* LESSON / QUESTION SET MANAGEMENT */}
        <Card className="shadow-sm">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Lesson Question Sets</CardTitle>
                <CardDescription>
                  View, add, edit, and inspect responses for each question.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-end gap-2 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddModule((v) => !v);
                    setEditingModuleId(null);
                    resetNewModuleForm();
                    setLessonDropdownOpen(false);
                    setModuleDropdownOpen(false);
                    setModuleFilterDropdownOpen(false);
                    setShowAddLesson(false);
                  }}
                  className="bg-white"
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> Add module
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddLesson((v) => !v);
                    setEditingLessonId(null);
                    resetNewLessonForm();
                    setLessonDropdownOpen(false);
                    setModuleDropdownOpen(false);
                    setModuleFilterDropdownOpen(false);
                    setShowAddModule(false);
                  }}
                  className="bg-white"
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> Add lesson
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowManageModules((v) => {
                      const next = !v;
                      if (next) setShowManageLessons(false);
                      return next;
                    });
                  }}
                  className="bg-white"
                >
                  {showManageModules ? "Hide modules" : "Manage modules"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowManageLessons((v) => {
                      const next = !v;
                      if (next) setShowManageModules(false);
                      return next;
                    });
                  }}
                  className="bg-white"
                >
                  {showManageLessons ? "Hide lessons" : "Manage lessons"}
                </Button>

                <label className="text-sm text-slate-600 flex flex-col gap-1 w-full sm:w-auto sm:min-w-[210px]">
                  <span className="font-medium">Module:</span>
                  <div
                    ref={moduleFilterDropdownRef}
                    className="relative w-full sm:w-[240px]"
                  >
                    <button
                      type="button"
                      onClick={() => setModuleFilterDropdownOpen((v) => !v)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between text-left"
                    >
                      <span className="truncate text-slate-800">
                        {lessonModuleFilter === "all"
                          ? "All modules"
                          : (() => {
                              const m = (modules || []).find(
                                (mod: any) =>
                                  mod.moduleKey === lessonModuleFilter,
                              );
                              return m
                                ? `${m.code} — ${m.title}`
                                : "All modules";
                            })()}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>
                    {moduleFilterDropdownOpen && (
                      <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto py-1">
                          {[
                            { key: "all", label: "All modules" },
                            ...(modules || []).map((m: any) => ({
                              key: m.moduleKey,
                              label: `${m.code} — ${m.title}`,
                            })),
                          ].map((opt) => {
                            const isSelected = lessonModuleFilter === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  setLessonModuleFilter(opt.key);
                                  setLessonDropdownOpen(false);
                                  setModuleFilterDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-900"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div className="font-medium truncate">
                                  {opt.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className="text-sm text-slate-600 flex flex-col gap-1 w-full sm:w-auto sm:min-w-[240px]">
                  <span className="font-medium">Select lesson:</span>
                  <div
                    ref={lessonDropdownRef}
                    className="relative w-full sm:w-[280px]"
                  >
                    <button
                      type="button"
                      disabled={
                        !filteredLessons || filteredLessons.length === 0
                      }
                      onClick={() => setLessonDropdownOpen((v) => !v)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left"
                    >
                      <span className="truncate text-slate-800">
                        {!lessons
                          ? "Loading lessons..."
                          : filteredLessons.length === 0
                            ? "No lessons for this module"
                            : selectedLesson?.title || "Select a lesson"}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>
                    {lessonDropdownOpen &&
                      filteredLessons &&
                      filteredLessons.length > 0 && (
                        <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                          <div className="max-h-64 overflow-y-auto py-1">
                            {filteredLessons.map((lesson: any) => {
                              const isSelected =
                                lesson._id === selectedLessonId;
                              return (
                                <button
                                  key={lesson._id}
                                  type="button"
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
            {/* Manage Modules/Lessons Modals */}
            {(showManageModules || showManageLessons) &&
              createPortal(
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowManageModules(false);
                      setShowManageLessons(false);
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                      <h2 className="text-sm font-semibold text-slate-800">
                        {showManageModules && showManageLessons
                          ? "Manage modules & lessons"
                          : showManageModules
                            ? "Manage modules"
                            : "Manage lessons"}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowManageModules(false);
                          setShowManageLessons(false);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="overflow-y-auto p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {showManageModules && (
                          <div className="col-span-full space-y-2">
                            {(modules || []).map((module: any) =>
                              editingModuleId === module._id ? (
                                <div
                                  key={module._id}
                                  className="border rounded-lg p-4 bg-slate-50"
                                >
                                  <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        Edit module
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Update module details.
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => resetNewModuleForm()}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-slate-700">
                                          Module code
                                        </label>
                                        <input
                                          type="text"
                                          className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          value={newModuleCode}
                                          onChange={(e) =>
                                            setNewModuleCode(e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-slate-700">
                                          Module title
                                        </label>
                                        <input
                                          type="text"
                                          className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          value={newModuleTitle}
                                          onChange={(e) =>
                                            setNewModuleTitle(e.target.value)
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-700">
                                        Description
                                      </label>
                                      <textarea
                                        rows={3}
                                        className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newModuleDescription}
                                        onChange={(e) =>
                                          setNewModuleDescription(
                                            e.target.value,
                                          )
                                        }
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
                                              onClick={() =>
                                                setNewModuleColor(c)
                                              }
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
                                              onClick={() =>
                                                setNewModuleIconKey(
                                                  opt.key as any,
                                                )
                                              }
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
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveModule}
                                      >
                                        Save module
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={module.moduleKey}
                                  draggable
                                  onDragStart={(event) => {
                                    setDraggedModuleId(module._id);
                                    event.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    setModuleDropTargetId(module._id);
                                  }}
                                  onDragLeave={() => {
                                    if (moduleDropTargetId === module._id)
                                      setModuleDropTargetId(null);
                                  }}
                                  onDrop={async (event) => {
                                    event.preventDefault();
                                    try {
                                      await handleDropModule(module._id);
                                    } catch (e: any) {
                                      alert(
                                        e?.message ||
                                          "Failed to reorder modules.",
                                      );
                                    } finally {
                                      setDraggedModuleId(null);
                                      setModuleDropTargetId(null);
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setDraggedModuleId(null);
                                    setModuleDropTargetId(null);
                                  }}
                                  className={`border rounded-md px-4 py-3 flex items-center justify-between gap-8 cursor-move transition-colors ${
                                    moduleDropTargetId === module._id
                                      ? "border-indigo-300 bg-indigo-50"
                                      : "bg-white"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                      {module.code} — {module.title}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {module.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-slate-600 hover:bg-slate-100"
                                      onClick={() => startEditModule(module)}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDeleteModule(module)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        {showManageLessons && (
                          <div className="col-span-full space-y-2">
                            {filteredLessons.map((lesson: any) =>
                              editingLessonId === lesson._id ? (
                                <div
                                  key={lesson._id}
                                  className="border rounded-lg p-4 bg-slate-50"
                                >
                                  <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        Edit lesson
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Update lesson details, difficulty, and
                                        ordering.
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => resetNewLessonForm()}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-slate-700">
                                          Course
                                        </label>
                                        <div
                                          ref={moduleDropdownRef}
                                          className="relative"
                                        >
                                          <button
                                            type="button"
                                            disabled={
                                              !modules || modules.length === 0
                                            }
                                            onClick={() =>
                                              setModuleDropdownOpen((v) => !v)
                                            }
                                            className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left"
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
                                              <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                                                <div className="max-h-48 overflow-y-auto py-1">
                                                  {modules.map((m: any) => {
                                                    const isSel =
                                                      m.moduleKey ===
                                                      newLessonSection;
                                                    return (
                                                      <button
                                                        key={m.moduleKey}
                                                        type="button"
                                                        onClick={() => {
                                                          setNewLessonSection(
                                                            m.moduleKey,
                                                          );
                                                          setModuleDropdownOpen(
                                                            false,
                                                          );
                                                        }}
                                                        className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                                          isSel
                                                            ? "bg-indigo-50 text-indigo-900"
                                                            : "text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                      >
                                                        <div className="font-medium truncate">
                                                          {m.code} — {m.title}
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
                                          className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          value={newLessonDifficulty}
                                          onChange={(e) =>
                                            setNewLessonDifficulty(
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-700">
                                        Lesson title
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newLessonTitle}
                                        onChange={(e) =>
                                          setNewLessonTitle(e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-700">
                                        Description
                                      </label>
                                      <textarea
                                        rows={3}
                                        className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newLessonDescription}
                                        onChange={(e) =>
                                          setNewLessonDescription(
                                            e.target.value,
                                          )
                                        }
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
                                          className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          value={newLessonXpReward}
                                          onChange={(e) =>
                                            setNewLessonXpReward(e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-slate-700">
                                          Order{" "}
                                          <span className="font-normal text-slate-500">
                                            (optional)
                                          </span>
                                        </label>
                                        <input
                                          type="number"
                                          min={1}
                                          className="w-full h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          value={newLessonOrder}
                                          onChange={(e) =>
                                            setNewLessonOrder(e.target.value)
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={resetNewLessonForm}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveLesson}
                                      >
                                        Save lesson
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={lesson._id}
                                  draggable
                                  onDragStart={(event) => {
                                    setDraggedLessonId(lesson._id);
                                    event.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    setLessonDropTargetId(lesson._id);
                                  }}
                                  onDragLeave={() => {
                                    if (lessonDropTargetId === lesson._id)
                                      setLessonDropTargetId(null);
                                  }}
                                  onDrop={async (event) => {
                                    event.preventDefault();
                                    try {
                                      await handleDropLesson(lesson._id);
                                    } catch (e: any) {
                                      alert(
                                        e?.message ||
                                          "Failed to reorder lessons.",
                                      );
                                    } finally {
                                      setDraggedLessonId(null);
                                      setLessonDropTargetId(null);
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setDraggedLessonId(null);
                                    setLessonDropTargetId(null);
                                  }}
                                  className={`border rounded-md px-4 py-3 flex items-center justify-between gap-8 cursor-move transition-colors ${
                                    lessonDropTargetId === lesson._id
                                      ? "border-indigo-300 bg-indigo-50"
                                      : "bg-white"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                      {lesson.title}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {lesson.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-slate-600 hover:bg-slate-100"
                                      onClick={() => startEditLesson(lesson)}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDeleteLesson(lesson)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {/* Add Module Modal */}
            {showAddModule &&
              createPortal(
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowAddModule(false);
                      resetNewModuleForm();
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                      <h2 className="text-sm font-semibold text-slate-800">
                        Create a new module
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddModule(false);
                          resetNewModuleForm();
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="overflow-y-auto p-4">
                      <div className="space-y-3">
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
                              onChange={(e) =>
                                setNewModuleTitle(e.target.value)
                              }
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
                            onChange={(e) =>
                              setNewModuleDescription(e.target.value)
                            }
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
                                  onClick={() =>
                                    setNewModuleIconKey(opt.key as any)
                                  }
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
                          <Button size="sm" onClick={handleSaveModule}>
                            Create module
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {/* Add Lesson Modal */}
            {showAddLesson &&
              createPortal(
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowAddLesson(false);
                      resetNewLessonForm();
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                      <h2 className="text-sm font-semibold text-slate-800">
                        Create a new lesson
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddLesson(false);
                          resetNewLessonForm();
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="overflow-y-auto p-4">
                      <div className="space-y-3">
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
                                  <div className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="max-h-64 overflow-y-auto py-1">
                                      {modules.map((m: any) => {
                                        const isSelected =
                                          m.moduleKey === newLessonSection;
                                        return (
                                          <button
                                            key={m.moduleKey}
                                            type="button"
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
                              onChange={(e) =>
                                setNewLessonDifficulty(e.target.value)
                              }
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
                            onChange={(e) =>
                              setNewLessonDescription(e.target.value)
                            }
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
                              onChange={(e) =>
                                setNewLessonXpReward(e.target.value)
                              }
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">
                              Order{" "}
                              <span className="font-normal text-slate-500">
                                (optional)
                              </span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              className="w-full h-9 rounded-md border border-slate-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              value={newLessonOrder}
                              onChange={(e) =>
                                setNewLessonOrder(e.target.value)
                              }
                              placeholder="Auto"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetNewLessonForm()}
                          >
                            Clear
                          </Button>
                          <Button size="sm" onClick={handleSaveLesson}>
                            Create lesson
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {/* Questions View */}
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
                      <PlusCircle className="w-4 h-4 mr-1" /> Add new question
                    </Button>
                  </div>

                  {selectedLesson.questions?.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedLesson.questions.map((q: any, idx: number) => (
                        <div
                          key={idx}
                          className="border rounded-md p-3 bg-white"
                        >
                          <div className="flex justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-1">
                                Q{idx + 1}
                              </p>
                              <p className="text-sm font-medium text-slate-800">
                                {q.question}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {q.type === "dragdrop" ? (
                                  <span className="italic">
                                    Drag & Drop Question
                                  </span>
                                ) : (
                                  <>
                                    Correct answer:{" "}
                                    <span className="font-semibold">
                                      {q.options?.[q.correct] ?? "Not set"}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 hover:bg-slate-100"
                                onClick={() => startEditQuestion(idx)}
                              >
                                <Pencil className="w-4 h-4 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteQuestion(idx)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>

                          {/* Responses Preview */}
                          {(() => {
                            const questionKey = `${selectedLesson._id}:${idx}`;
                            const responses =
                              lessonResponsesByQuestion.get(idx) || [];
                            const uniquePickersByOption = (q.options || []).map(
                              (_option: string, optionIdx: number) => {
                                const users = new Set<string>();
                                for (const response of responses) {
                                  if (response.selectedOption === optionIdx)
                                    users.add(response.userId);
                                }
                                return users.size;
                              },
                            );
                            const uniqueNoAnswerUsers = new Set<string>();
                            for (const response of responses) {
                              if (
                                response.selectedOption === null &&
                                !response.placedSections
                              )
                                uniqueNoAnswerUsers.add(response.userId);
                            }

                            return (
                              <div className="mt-3 border-t pt-3">
                                {q.type !== "dragdrop" ? (
                                  <div className="mb-2 space-y-1">
                                    {(q.options || []).map(
                                      (option: string, optionIdx: number) => (
                                        <p
                                          key={`${questionKey}:count:${optionIdx}`}
                                          className="text-xs text-slate-600"
                                        >
                                          <span className="font-semibold">
                                            Option {optionIdx + 1}:
                                          </span>{" "}
                                          {uniquePickersByOption[optionIdx]}{" "}
                                          {uniquePickersByOption[optionIdx] ===
                                          1
                                            ? "person"
                                            : "people"}
                                          <span className="text-slate-500">{` (${option})`}</span>
                                        </p>
                                      ),
                                    )}
                                    {uniqueNoAnswerUsers.size > 0 && (
                                      <p className="text-xs text-slate-600">
                                        <span className="font-semibold">
                                          No answer:
                                        </span>{" "}
                                        {uniqueNoAnswerUsers.size}{" "}
                                        {uniqueNoAnswerUsers.size === 1
                                          ? "person"
                                          : "people"}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mb-2 space-y-1">
                                    <p className="text-xs text-slate-600">
                                      <span className="font-semibold">
                                        Total Responses:
                                      </span>{" "}
                                      {responses.length}
                                    </p>
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setResponseModalQuestionIndex(idx)
                                  }
                                >
                                  {`View responses (${responses.length})`}
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      This lesson does not have any questions yet.
                    </p>
                  )}
                </div>

                {/* Response Modal */}
                {responseModalQuestionIndex !== null &&
                  createPortal(
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                      onPointerDown={(e) => {
                        if (e.target === e.currentTarget)
                          setResponseModalQuestionIndex(null);
                      }}
                    >
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                          <div>
                            <h2 className="text-sm font-semibold text-slate-800">
                              Question Responses
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {selectedLesson.questions?.[
                                responseModalQuestionIndex
                              ]
                                ? `Q${responseModalQuestionIndex + 1}: ${selectedLesson.questions[responseModalQuestionIndex].question}`
                                : "Question not found"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResponseModalQuestionIndex(null)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="overflow-y-auto p-4">
                          {(() => {
                            const activeQuestion =
                              selectedLesson.questions?.[
                                responseModalQuestionIndex
                              ];
                            const responses =
                              lessonResponsesByQuestion.get(
                                responseModalQuestionIndex,
                              ) || [];
                            const modalKey = `${selectedLesson._id}:${responseModalQuestionIndex}`;

                            if (!activeQuestion)
                              return (
                                <p className="text-xs text-slate-500 italic">
                                  This question is no longer available.
                                </p>
                              );
                            if (!selectedLessonAttempts)
                              return (
                                <p className="text-xs text-slate-500">
                                  Loading responses...
                                </p>
                              );
                            if (responses.length === 0)
                              return (
                                <p className="text-xs text-slate-500 italic">
                                  No responses yet for this question.
                                </p>
                              );

                            return (
                              <div className="space-y-2">
                                {responses.map((response, responseIdx) => {
                                  const selectedOptionLabel =
                                    response.selectedOption !== null
                                      ? `Option ${response.selectedOption + 1}`
                                      : "No answer";
                                  const selectedOptionText =
                                    response.selectedOption !== null
                                      ? activeQuestion.options?.[
                                          response.selectedOption
                                        ] || "Option text unavailable"
                                      : "No answer";
                                  const displayName = formatResponseName(
                                    response.userId,
                                  );
                                  const submittedAt = formatResponseTimestamp(
                                    response.submittedAt,
                                  );

                                  return (
                                    <div
                                      key={`${modalKey}:${responseIdx}`}
                                      className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-slate-700">
                                          {displayName}
                                        </span>
                                        <span className="text-slate-500">
                                          Submitted: {submittedAt}
                                        </span>
                                      </div>

                                      {activeQuestion.type !== "dragdrop" ? (
                                        <div className="mt-1 text-slate-600">
                                          Answer: {selectedOptionLabel}{" "}
                                          {selectedOptionLabel !== "No answer"
                                            ? ` - ${selectedOptionText}`
                                            : ""}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-slate-600 bg-white p-2 rounded border border-slate-200">
                                          <span className="font-semibold block mb-2 text-[11px] uppercase tracking-wider text-slate-500">
                                            Student's Layout
                                          </span>
                                          {response.placedSections &&
                                          response.placedSections.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                              {response.placedSections.map(
                                                (sec: any, secIdx: number) => (
                                                  <div
                                                    key={secIdx}
                                                    className="flex-1 min-w-[100px] border border-indigo-100 rounded bg-indigo-50/30 p-1.5"
                                                  >
                                                    <div className="font-semibold text-[10px] text-indigo-900 border-b border-indigo-100 pb-0.5 mb-1">
                                                      {sec.name}
                                                    </div>
                                                    {sec.answers &&
                                                    sec.answers.length > 0 ? (
                                                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                                                        {sec.answers.map(
                                                          (
                                                            a: string,
                                                            aIdx: number,
                                                          ) => (
                                                            <li key={aIdx}>
                                                              {a}
                                                            </li>
                                                          ),
                                                        )}
                                                      </ul>
                                                    ) : (
                                                      <span className="text-[10px] italic text-slate-400">
                                                        Empty
                                                      </span>
                                                    )}
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          ) : (
                                            <span className="italic text-[11px] text-slate-400">
                                              No layout saved.
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      <div className="mt-2 text-slate-600 flex justify-between items-center">
                                        <span>
                                          Time spent:{" "}
                                          {formatDurationMs(
                                            response.timeSpentMs,
                                          )}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-semibold ${response.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                        >
                                          {response.isCorrect
                                            ? "Correct"
                                            : "Incorrect"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )}

                {/* Edit / Add Form */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">
                    {editingIndex === null
                      ? "Add a new question"
                      : `Edit question ${editingIndex + 1}`}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Question type
                      </label>
                      <select
                        className="w-full h-9 rounded-md border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                        value={questionType}
                        onChange={(e) =>
                          setQuestionType(e.target.value as "mcq" | "dragdrop")
                        }
                      >
                        <option value="mcq">Multiple Choice</option>
                        <option value="dragdrop">Drag & Drop</option>
                      </select>
                    </div>
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

                    {questionType === "mcq" && (
                      <>
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
                              Correct option number{" "}
                              <span className="font-normal text-slate-500">
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
                        </div>
                      </>
                    )}

                    {questionType === "dragdrop" && (
                      <div className="border rounded-md p-3 bg-slate-50">
                        <div className="mb-2">
                          <label className="text-xs font-medium text-slate-700">
                            Answer bank
                          </label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              className="flex-1 rounded-md border border-slate-200 text-sm px-2 h-8"
                              value={ddBankInput}
                              onChange={(e) => setDdBankInput(e.target.value)}
                              placeholder="Add answer and press Enter"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && ddBankInput.trim()) {
                                  setDdAnswerBank([
                                    ...ddAnswerBank,
                                    {
                                      id: crypto.randomUUID(),
                                      text: ddBankInput.trim(),
                                    },
                                  ]);
                                  setDdBankInput("");
                                  e.preventDefault();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
                              onClick={() => {
                                if (ddBankInput.trim()) {
                                  setDdAnswerBank([
                                    ...ddAnswerBank,
                                    {
                                      id: crypto.randomUUID(),
                                      text: ddBankInput.trim(),
                                    },
                                  ]);
                                  setDdBankInput("");
                                }
                              }}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ddAnswerBank.map((ans) => (
                              <div
                                key={ans.id}
                                draggable
                                onDragStart={(e) =>
                                  e.dataTransfer.setData("text/plain", ans.id)
                                }
                                className="px-2 py-1 bg-white border rounded shadow text-sm cursor-move flex items-center"
                              >
                                {ans.text}
                                <button
                                  type="button"
                                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                                  onClick={() =>
                                    setDdAnswerBank(
                                      ddAnswerBank.filter(
                                        (a) => a.id !== ans.id,
                                      ),
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="text-xs font-medium text-slate-700">
                            Sections
                          </label>
                          <div className="flex gap-2 mb-2">
                            {ddSections.map((section, sIdx) => (
                              <input
                                key={`sec-input-${sIdx}`}
                                type="text"
                                className="rounded-md border border-slate-200 text-sm px-2 h-8"
                                value={section.name}
                                onChange={(e) => {
                                  const newSections = [...ddSections];
                                  newSections[sIdx].name = e.target.value;
                                  setDdSections(newSections);
                                }}
                              />
                            ))}
                            <button
                              type="button"
                              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                              onClick={() =>
                                setDdSections([
                                  ...ddSections,
                                  {
                                    name: `Section ${ddSections.length + 1}`,
                                    answers: [],
                                  },
                                ])
                              }
                            >
                              + Add Section
                            </button>
                          </div>
                          <div className="flex gap-4">
                            {ddSections.map((section, sIdx) => (
                              <div
                                key={`sec-drop-${sIdx}`}
                                className="flex-1 min-w-[120px] bg-white border rounded p-2 min-h-[60px]"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  const draggedId =
                                    e.dataTransfer.getData("text/plain");
                                  if (!draggedId) return;

                                  let draggedItem = ddAnswerBank.find(
                                    (a) => a.id === draggedId,
                                  );
                                  if (!draggedItem) {
                                    for (const sec of ddSections) {
                                      const found = sec.answers.find(
                                        (a) => a.id === draggedId,
                                      );
                                      if (found) draggedItem = found;
                                    }
                                  }
                                  if (!draggedItem) return;

                                  setDdAnswerBank((prev) =>
                                    prev.filter((a) => a.id !== draggedId),
                                  );

                                  const newSections = ddSections.map(
                                    (sec, i) => {
                                      const filteredAnswers =
                                        sec.answers.filter(
                                          (a) => a.id !== draggedId,
                                        );
                                      if (i === sIdx) {
                                        return {
                                          ...sec,
                                          answers: [
                                            ...filteredAnswers,
                                            draggedItem!,
                                          ],
                                        };
                                      }
                                      return {
                                        ...sec,
                                        answers: filteredAnswers,
                                      };
                                    },
                                  );

                                  setDdSections(newSections);
                                }}
                              >
                                <div className="font-semibold text-xs mb-1 border-b pb-1">
                                  {section.name}
                                </div>
                                {section.answers.length === 0 && (
                                  <div className="text-slate-400 text-xs italic mt-2">
                                    Drop answers here
                                  </div>
                                )}
                                {section.answers.map((ans) => (
                                  <div
                                    key={ans.id}
                                    className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded shadow-sm text-sm flex items-center justify-between mt-2 cursor-move"
                                    draggable
                                    onDragStart={(e) =>
                                      e.dataTransfer.setData(
                                        "text/plain",
                                        ans.id,
                                      )
                                    }
                                  >
                                    <span className="truncate mr-2">
                                      {ans.text}
                                    </span>
                                    <button
                                      type="button"
                                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                                      onClick={() => {
                                        const newSections = [...ddSections];
                                        newSections[sIdx].answers = newSections[
                                          sIdx
                                        ].answers.filter(
                                          (a) => a.id !== ans.id,
                                        );
                                        setDdSections(newSections);
                                        setDdAnswerBank([...ddAnswerBank, ans]);
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">
                        Upload image
                      </label>
                      <input
                        id="question-image-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        ref={imageInputRef}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          imageInputRef.current?.click();
                        }}
                        className={`inline-flex w-fit items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
                      >
                        Choose image to upload
                      </button>
                      <p className="text-[11px] text-slate-500">
                        {imageFileName || "No file selected"}
                      </p>
                      {imageStorageId && (
                        <p className="text-[11px] text-slate-500">
                          Uploaded: {imageStorageId}
                        </p>
                      )}

                      <div className="mt-2 w-full h-48 bg-slate-50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <p className="text-xs text-slate-500">
                              Securely Processing Image...
                            </p>
                          </div>
                        ) : previewUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              key={previewUrl}
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-contain p-2"
                              onError={() => {
                                setBrokenLinks((prev) => {
                                  const next = new Set(prev);
                                  next.add(previewUrl);
                                  return next;
                                });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImageUrl("");
                                setImageStorageId("");
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                              title="Remove image"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <p className="text-xs text-slate-400 font-medium italic">
                              {brokenLinks.size > 0
                                ? "Blocked resource hidden"
                                : "Ready for diagram"}
                            </p>
                          </div>
                        )}
                      </div>
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
                      <Button
                        size="sm"
                        onClick={handleSaveQuestion}
                        disabled={isUploading}
                      >
                        {isUploading
                          ? "Uploading image..."
                          : editingIndex === null
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
