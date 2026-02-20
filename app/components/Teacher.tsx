import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOptionNumber, setCorrectOptionNumber] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageStorageId, setImageStorageId] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<
    string | null
  >(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [expandedReportLessons, setExpandedReportLessons] = useState<
    Set<string>
  >(new Set());
  const [expandedQuestionResponses, setExpandedQuestionResponses] = useState<
    Set<string>
  >(new Set());
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [moduleDropTargetId, setModuleDropTargetId] = useState<string | null>(
    null,
  );
  const [lessonDropTargetId, setLessonDropTargetId] = useState<string | null>(
    null,
  );

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
        isCorrect: boolean;
        submittedAt: string;
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
          selectedOption: ans.selectedOption,
          isCorrect: ans.isCorrect,
          submittedAt,
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
    setExpandedQuestionResponses(new Set());
  }, [selectedLessonId]);

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
    setShowAddModule(true);
    setShowAddLesson(false);
    setLessonDropdownOpen(false);
    setModuleDropdownOpen(false);

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

        const updatedModuleKey = res?.moduleKey;
        if (updatedModuleKey) {
          setNewLessonSection(updatedModuleKey);
        }
      } else {
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

    const confirmDelete = window.confirm(
      `Delete module "${module.code} — ${module.title}"?`,
    );
    if (!confirmDelete) return;

    try {
      await deleteModule({ id: module._id });
      if (editingModuleId === module._id) {
        resetNewModuleForm();
      }
      alert("Module deleted.");
    } catch (e: any) {
      alert(e?.message || "Failed to delete module.");
    }
  };

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson._id);
    setShowAddLesson(true);
    setShowAddModule(false);
    setLessonDropdownOpen(false);
    setModuleDropdownOpen(false);

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

      const createdId = res?.id;
      if (createdId) {
        setSelectedLessonId(createdId);
      }
    }

    setLessonDropdownOpen(false);
    setShowAddLesson(false);
    setEditingIndex(null);
    resetForm();
    resetNewLessonForm();
    alert(editingLessonId ? "Lesson updated." : "Lesson created.");
  };

  const handleDeleteLesson = async (lesson: any) => {
    const confirmDelete = window.confirm(
      `Delete lesson "${lesson.title}"? This also deletes its question images.`,
    );
    if (!confirmDelete) return;

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

    const reordered = reorderById(modules as any[], draggedModuleId, targetModuleId);
    const reorderedIds = reordered
      .map((item) => item._id)
      .filter(Boolean) as Id<"modules">[];

    if (reorderedIds.length === 0) return;
    await reorderModules({ moduleIds: reorderedIds });
  };

  const handleDropLesson = async (targetLessonId: string) => {
    if (!draggedLessonId || !lessons) return;

    const reordered = reorderById(lessons as any[], draggedLessonId, targetLessonId);
    const reorderedIds = reordered
      .map((item) => item._id)
      .filter(Boolean) as Id<"lessons">[];

    if (reorderedIds.length === 0) return;
    await reorderLessons({ lessonIds: reorderedIds });
  };

  const resetForm = () => {
    setQuestionText("");
    setOptionsText("");
    setCorrectOptionNumber("");
    setExplanation("");
    setImageUrl("");
    setImageStorageId("");
    setImageFileName("");
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
    setImageStorageId(q.imageStorageId || "");
    setImageFileName("");
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

    const trimmedStorageId = imageStorageId.trim();
    if (trimmedStorageId) {
      newQuestion.imageStorageId = trimmedStorageId;
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

  const handleResetAllStudentProgress = async () => {
    const confirmDelete = window.confirm(
      "Reset all student progress for everyone? This will permanently remove XP, streaks, completion progress, and lesson attempts.",
    );

    if (!confirmDelete) return;

    const confirmationText = window.prompt(
      'Type RESET to confirm deleting all student progress:',
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

        {selectedStudentUserId && (
          <Card className="shadow-sm">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Report</CardTitle>
                  <CardDescription>
                    {selectedStudentName
                      ? `${selectedStudentName} · Latest attempt per lesson`
                      : "Latest attempt per lesson"}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStudentUserId(null);
                    setSelectedStudentName("");
                  }}
                  className="bg-white"
                >
                  Clear selection
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
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
                  {reportLessons.map(
                    ({ lesson, latestAttempt, attemptCount }) => {
                      const answerMap = new Map<number, any>();
                      for (const ans of latestAttempt.answers || []) {
                        answerMap.set(ans.questionIndex, ans);
                      }

                      const lessonKey = String(lesson._id);
                      const isExpanded = expandedReportLessons.has(lessonKey);
                      const updatedAt =
                        latestAttempt.updatedAt || latestAttempt.startedAt;

                      return (
                        <div
                          key={lesson._id}
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
                                Last updated: {updatedAt ? updatedAt : "-"}
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
                              {isExpanded ? "Hide questions" : "Show questions"}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {lesson.questions.map((q: any, idx: number) => {
                                const ans = answerMap.get(idx);
                                const selectedOption =
                                  ans && ans.selectedOption !== null
                                    ? q.options?.[ans.selectedOption]
                                    : "No answer";
                                const isCorrect = ans ? ans.isCorrect : false;

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
                                    <div className="mt-2">
                                      {ans ? (
                                        <span
                                          className={`text-xs px-2 py-1 rounded-full font-bold ${
                                            isCorrect
                                              ? "bg-green-100 text-green-700"
                                              : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {isCorrect ? "Correct" : "Incorrect"}
                                        </span>
                                      ) : (
                                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-slate-200 text-slate-600">
                                          Not answered
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
                    setShowAddLesson(false);
                  }}
                  className="bg-white"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add module
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
                  <select
                    value={lessonModuleFilter}
                    onChange={(e) => {
                      setLessonModuleFilter(e.target.value);
                      setLessonDropdownOpen(false);
                    }}
                    className="h-9 w-full sm:w-[240px] rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All modules</option>
                    {(modules || []).map((module: any) => (
                      <option key={module.moduleKey} value={module.moduleKey}>
                        {module.code} — {module.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600 flex flex-col gap-1 w-full sm:w-auto sm:min-w-[240px]">
                  <span className="font-medium">Select lesson:</span>
                  <div ref={lessonDropdownRef} className="relative w-full sm:w-[280px]">
                    <button
                      type="button"
                      disabled={!filteredLessons || filteredLessons.length === 0}
                      onClick={() => setLessonDropdownOpen((v) => !v)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between text-left"
                      aria-haspopup="listbox"
                      aria-expanded={lessonDropdownOpen}
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
                      <div
                        role="listbox"
                        className="absolute mt-1 w-full z-50 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden"
                      >
                        <div className="max-h-64 overflow-y-auto py-1">
                          {filteredLessons.map((lesson: any) => {
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
            {(showManageModules || showManageLessons) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {showManageModules && (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Manage modules
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(modules || []).map((module: any) => (
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
                            if (moduleDropTargetId === module._id) {
                              setModuleDropTargetId(null);
                            }
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            try {
                              await handleDropModule(module._id);
                            } catch (e: any) {
                              alert(e?.message || "Failed to reorder modules.");
                            } finally {
                              setDraggedModuleId(null);
                              setModuleDropTargetId(null);
                            }
                          }}
                          onDragEnd={() => {
                            setDraggedModuleId(null);
                            setModuleDropTargetId(null);
                          }}
                          className={`border rounded-md px-3 py-2 flex items-center justify-between gap-3 cursor-move transition-colors ${
                            moduleDropTargetId === module._id
                              ? "border-indigo-300 bg-indigo-50"
                              : ""
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
                              title="Edit module"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteModule(module)}
                              title="Delete module"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showManageLessons && (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Manage lessons
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {filteredLessons.map((lesson: any) => (
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
                            if (lessonDropTargetId === lesson._id) {
                              setLessonDropTargetId(null);
                            }
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            try {
                              await handleDropLesson(lesson._id);
                            } catch (e: any) {
                              alert(e?.message || "Failed to reorder lessons.");
                            } finally {
                              setDraggedLessonId(null);
                              setLessonDropTargetId(null);
                            }
                          }}
                          onDragEnd={() => {
                            setDraggedLessonId(null);
                            setLessonDropTargetId(null);
                          }}
                          className={`border rounded-md px-3 py-2 flex items-center justify-between gap-3 cursor-move transition-colors ${
                            lessonDropTargetId === lesson._id
                              ? "border-indigo-300 bg-indigo-50"
                              : ""
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
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteLesson(lesson)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showAddModule && (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {editingModuleId ? "Edit module" : "Create a new module"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {editingModuleId
                        ? "Update module details."
                        : "Modules show up as course tiles on the student dashboard."}
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
                    <Button size="sm" onClick={handleSaveModule}>
                      {editingModuleId ? "Save module" : "Create module"}
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
                      {editingLessonId ? "Edit lesson" : "Create a new lesson"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {editingLessonId
                        ? "Update lesson details, difficulty, and ordering."
                        : "This lesson will be visible to all students."}
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
                    <Button size="sm" onClick={handleSaveLesson}>
                      {editingLessonId ? "Save lesson" : "Create lesson"}
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

                          {(() => {
                            const questionKey = `${selectedLesson._id}:${idx}`;
                            const isResponsesExpanded =
                              expandedQuestionResponses.has(questionKey);
                            const responses =
                              lessonResponsesByQuestion.get(idx) || [];
                            const uniquePickersByOption = (q.options || []).map(
                              (_option: string, optionIdx: number) => {
                                const users = new Set<string>();
                                for (const response of responses) {
                                  if (response.selectedOption === optionIdx) {
                                    users.add(response.userId);
                                  }
                                }
                                return users.size;
                              },
                            );
                            const uniqueNoAnswerUsers = new Set<string>();
                            for (const response of responses) {
                              if (response.selectedOption === null) {
                                uniqueNoAnswerUsers.add(response.userId);
                              }
                            }

                            return (
                              <div className="mt-3 border-t pt-3">
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
                                        {uniquePickersByOption[optionIdx] === 1
                                          ? "person"
                                          : "people"}
                                        <span className="text-slate-500">
                                          {` (${option})`}
                                        </span>
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

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedQuestionResponses((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(questionKey)) {
                                        next.delete(questionKey);
                                      } else {
                                        next.add(questionKey);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  {isResponsesExpanded
                                    ? "Hide responses"
                                    : `View responses (${responses.length})`}
                                </Button>

                                {isResponsesExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {!selectedLessonAttempts && (
                                      <p className="text-xs text-slate-500">
                                        Loading responses...
                                      </p>
                                    )}

                                    {selectedLessonAttempts &&
                                      responses.length === 0 && (
                                        <p className="text-xs text-slate-500 italic">
                                          No responses yet for this question.
                                        </p>
                                      )}

                                    {selectedLessonAttempts &&
                                      responses.length > 0 &&
                                      responses.map((response, responseIdx) => {
                                        const selectedOptionLabel =
                                          response.selectedOption !== null
                                            ? `Option ${response.selectedOption + 1}`
                                            : "No answer";
                                        const selectedOptionText =
                                          response.selectedOption !== null
                                            ? q.options?.[
                                                response.selectedOption
                                              ] || "Option text unavailable"
                                            : "No answer";
                                        const displayName = formatResponseName(
                                          response.userId,
                                        );
                                        const submittedAt =
                                          formatResponseTimestamp(
                                            response.submittedAt,
                                          );

                                        return (
                                          <div
                                            key={`${questionKey}:${responseIdx}`}
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
                                            <div className="mt-1 text-slate-600">
                                              Answer: {selectedOptionLabel}
                                              {selectedOptionLabel !==
                                              "No answer"
                                                ? ` - ${selectedOptionText}`
                                                : ""}
                                            </div>
                                            <div className="mt-1">
                                              <span
                                                className={`px-2 py-0.5 rounded-full font-semibold ${
                                                  response.isCorrect
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
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
                                )}
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
                          onClick={(event) => {
                            event.preventDefault();
                            imageInputRef.current?.click();
                          }}
                          className={`inline-flex w-fit items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${
                            isUploading
                              ? "opacity-60 pointer-events-none"
                              : "cursor-pointer"
                          }`}
                        >
                          Choose image to upload
                        </button>
                        <p className="text-[11px] text-slate-500">
                          {imageFileName || "No file selected"}
                        </p>
                        {imageStorageId ? (
                          <p className="text-[11px] text-slate-500">
                            Uploaded: {imageStorageId}
                          </p>
                        ) : null}
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
