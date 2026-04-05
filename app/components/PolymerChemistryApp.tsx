"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { StudentLeaderboard } from "./StudentLeaderboard";
import { ExplainerText } from "./ExplainerText";
import DragDropStudentQuestion from "./DragDropStudentQuestion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Flame,
  Book,
  Settings,
  Download,
  RotateCcw,
  Volume2,
  ArrowLeft,
  Beaker,
  BookOpen,
  Atom,
  LayoutDashboard,
  Home,
  Crown,
  ArrowRight,
  Search,
} from "lucide-react";
import { filterGlossaryTerms } from "@/lib/studentUtils";

/**
 * PolymerChemistryApp — main student learning interface for PolymerLingo.
 *
 * Manages the complete student experience including module/lesson navigation,
 * quiz taking (MCQ, drag-and-drop, fill-in-the-blank), progress tracking,
 * leaderboard, glossary, and settings. Handles lesson attempt persistence via
 * Convex, audio feedback, and review screens with answer breakdowns. Renders
 * different views based on state: dashboard, active lesson, review, settings,
 * leaderboard, or glossary. Accepts no props — fetches all data via Convex hooks.
 */
const PolymerChemistryApp = () => {
  // ========================================
  // 1. MODULE CONFIGURATION
  // ========================================
  const DEFAULT_MODULES: Array<any> = [
    {
      moduleKey: "qxu5031",
      code: "QXU5031",
      title: "Polymer Chemistry",
      description: "Intro, MW, Step-Growth & Radical",
      color: "indigo",
      iconKey: "bookOpen",
      order: 1,
    },
    {
      moduleKey: "qxu6033",
      code: "QXU6033",
      title: "Advanced Chemistry",
      description: "CRP, Dendrimers & Self-Assembly",
      color: "pink",
      iconKey: "beaker",
      order: 2,
    },
  ];

  // ========================================
  // 2. STATE MANAGEMENT
  // ========================================
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<any>>([]);
  const [failedQuestionImages, setFailedQuestionImages] = useState<Set<string>>(
    new Set(),
  );
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(
    Date.now(),
  );
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewAnimate, setReviewAnimate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  // ========================================
  // 3. BACKEND INTEGRATION (Convex)
  // ========================================
  const userProgress = useQuery(api.userProgress.get);
  const lessons = useQuery(api.lessons.getAll);
  const modules = useQuery(api.modules.getAll);
  const glossaryTerms = useQuery(api.glossary.getAll);

  const updateProgress = useMutation(api.userProgress.update);
  const resetProgress = useMutation(api.userProgress.reset);
  const initializeUser = useMutation(api.userProgress.initializeUser);
  const startOrResumeAttempt = useMutation(
    api.lessonAttempts.startOrResumeAttempt,
  );
  const saveAnswer = useMutation(api.lessonAttempts.saveAnswer);
  const finalizeAttempt = useMutation(api.lessonAttempts.finalizeAttempt);

  // ========================================
  // 4. CLERK HOOKS & AUDIO
  // ========================================
  const { user } = useUser();
  const router = useRouter();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const correctSound = useRef<HTMLAudioElement | null>(null);
  const wrongSound = useRef<HTMLAudioElement | null>(null);

  // ========================================
  // 5. EFFECTS
  // ========================================
  useEffect(() => {
    if (user) {
      initializeUser({
        userId: user.id,
        userName: user.fullName || user.firstName || "Student",
      });
    }
  }, [user, initializeUser]);

  useEffect(() => {
    let t: number | undefined;
    if (showReview) {
      t = window.setTimeout(() => setReviewAnimate(true), 20);
    }
    return () => {
      if (t) clearTimeout(t);
      setReviewAnimate(false);
    };
  }, [showReview]);

  useEffect(() => {
    if (currentLesson && currentLesson.questions) {
      const questionText = currentLesson.questions[currentQuestion].question;
      window.speechSynthesis.cancel();
      const timer = setTimeout(() => speak(questionText), 300);
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [currentQuestion, currentLesson]);

  // ========================================
  // 6. DERIVED STATE
  // ========================================
  const xp = userProgress?.xp || 0;
  const streak = userProgress?.streak || 0;
  const completedLessonIds = userProgress?.completedLessonIds || [];

  // ========================================
  // 7. HANDLERS
  // ========================================
  const startLesson = async (lesson: any) => {
    setCurrentLesson(lesson);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setShowReview(false);
    setReviewAnimate(false);
    setSelectedAnswers(Array(lesson.questions.length).fill(null));
    setQuestionStartedAt(Date.now());
    setActiveAttemptId(null);

    try {
      const res: any = await startOrResumeAttempt({ lessonId: lesson._id });
      setActiveAttemptId(res?.id || null);

      const restoredAnswers = Array(lesson.questions.length).fill(null);
      for (const answer of res?.answers || []) {
        const index = answer?.questionIndex;
        if (
          typeof index === "number" &&
          index >= 0 &&
          index < restoredAnswers.length
        ) {
          if (lesson.questions[index].type === "dragdrop") {
            restoredAnswers[index] = answer.placedSections || null;
          } else if (lesson.questions[index].type === "fillblank") {
            restoredAnswers[index] = answer.textAnswer || null;
          } else {
            restoredAnswers[index] =
              typeof answer.selectedOption === "number"
                ? answer.selectedOption
                : null;
          }
        }
      }

      setSelectedAnswers(restoredAnswers);

      const nextQuestionIndex = restoredAnswers.findIndex(
        (answer: any) => answer === null,
      );

      if (nextQuestionIndex === -1 && restoredAnswers.length > 0) {
        const lastIndex = restoredAnswers.length - 1;
        setCurrentQuestion(lastIndex);
        setSelectedAnswer(restoredAnswers[lastIndex]);
        setShowReview(true);
        setScore(computeFinalScoreFromAnswers(restoredAnswers, lesson));
      } else {
        const resumeIndex = nextQuestionIndex >= 0 ? nextQuestionIndex : 0;
        setCurrentQuestion(resumeIndex);
        setSelectedAnswer(restoredAnswers[resumeIndex] ?? null);
        setShowReview(false);
      }
      setShowResult(false);
      setQuestionStartedAt(Date.now());
    } catch (err) {
      console.error("Attempt start failed:", err);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
  };

  const handleAnswerSubmit = (answerPayload: any) => {
    if (showResult) return;

    const question = currentLesson.questions[currentQuestion];

    if (question.type !== "dragdrop" && question.type !== "fillblank") {
      const optionText = question.options[answerPayload as number];
      speak(optionText);
    }

    setSelectedAnswer(answerPayload);
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = answerPayload;
      return next;
    });
    // Do NOT trigger check or backend save here
  };

  // Helper to play chime reliably after user interaction
  const playChime = (type: "correct" | "wrong") => {
    let audioRef = type === "correct" ? correctSound : wrongSound;
    let audio = audioRef.current;
    if (!audio) {
      // Try to re-query the DOM if ref is lost
      audio = document.querySelector(
        type === "correct"
          ? 'audio[src="/sounds/correct.mp3"]'
          : 'audio[src="/sounds/incorrect.mp3"]',
      );
      if (audio) {
        audioRef.current = audio as HTMLAudioElement;
      } else {
        return;
      }
    }
    try {
      audio.currentTime = 0;
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          /* ignore autoplay errors */
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const triggerCheckAnswer = (userAnswer: any, isCorrect: boolean) => {
    setShowResult(true);

    const question = currentLesson.questions[currentQuestion];
    const elapsedMs = Math.max(0, Date.now() - questionStartedAt);

    if (activeAttemptId) {
      const dbPayload =
        question.type === "dragdrop"
          ? { placedSections: userAnswer }
          : question.type === "fillblank"
            ? { textAnswer: userAnswer as string }
            : { selectedOption: userAnswer as number };

      saveAnswer({
        attemptId: activeAttemptId as Id<"lessonAttempts">,
        questionIndex: currentQuestion,
        isCorrect,
        timeSpentMs: elapsedMs,
        ...dbPayload,
      }).catch((err) => console.error("Answer save failed:", err));
    }

    // Play chime after user interaction
    if (isCorrect) {
      playChime("correct");
    } else {
      playChime("wrong");
    }

    const interimScore =
      selectedAnswers?.reduce((acc, ans, idx) => {
        const q = currentLesson?.questions?.[idx];
        if (!q || ans === null) return acc;

        let wasCorrect = false;
        if (q.type === "dragdrop") {
          wasCorrect =
            idx === currentQuestion
              ? isCorrect
              : evaluateDragDropCorrectness(q, ans);
        } else if (q.type === "fillblank") {
          wasCorrect =
            idx === currentQuestion
              ? isCorrect
              : String(ans || "")
                  .trim()
                  .toLowerCase() ===
                String(q.correctAnswer || "")
                  .trim()
                  .toLowerCase();
        } else {
          wasCorrect = ans === q.correct;
        }

        return wasCorrect ? acc + 1 : acc;
      }, 0) ?? 0;

    setScore(interimScore + (isCorrect ? 1 : 0)); // Add current question if correct
  };

  const evaluateDragDropCorrectness = (question: any, studentAns: any) => {
    if (!studentAns) return false;
    return question.sections.every((correctSec: any) => {
      const studentSec = studentAns?.find(
        (s: any) => s.name === correctSec.name,
      );
      if (
        !studentSec ||
        correctSec.answers.length !== studentSec.answers.length
      )
        return false;
      const correctSorted = [...correctSec.answers].sort();
      const studentSorted = [...studentSec.answers]
        .map((a: any) => (typeof a === "string" ? a : a.text))
        .sort();
      return correctSorted.every(
        (val: string, i: number) => val === studentSorted[i],
      );
    });
  };

  const nextQuestion = () => {
    if (currentQuestion < currentLesson.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(selectedAnswers[currentQuestion + 1] ?? null);
      setShowResult(false);
      setQuestionStartedAt(Date.now());
    } else {
      setShowReview(true);
    }
  };

  const computeFinalScoreFromAnswers = (answers: any[], lesson: any) => {
    return answers.reduce((acc, ans, idx) => {
      if (ans === null) return acc;
      const q = lesson.questions[idx];
      let isCorrect = false;
      if (q.type === "dragdrop") {
        isCorrect = evaluateDragDropCorrectness(q, ans);
      } else if (q.type === "fillblank") {
        isCorrect =
          String(ans || "")
            .trim()
            .toLowerCase() ===
          String(q.correctAnswer || "")
            .trim()
            .toLowerCase();
      } else {
        isCorrect = ans === q.correct;
      }
      return isCorrect ? acc + 1 : acc;
    }, 0);
  };

  const computeFinalScore = () => {
    if (!currentLesson) return 0;
    return computeFinalScoreFromAnswers(selectedAnswers, currentLesson);
  };

  const hideReview = (callback?: () => void) => {
    setReviewAnimate(false);
    window.setTimeout(() => {
      setShowReview(false);
      if (callback) callback();
    }, 220);
  };

  const completeLesson = async () => {
    if (!currentLesson) return;

    const finalScore = computeFinalScore();
    const earnedXP = Math.round(
      ((finalScore || 0) / currentLesson.questions.length) *
        currentLesson.xpReward,
    );
    const newXp = xp + earnedXP;
    const newStreak = streak + 1;

    let newCompletedLessons = [...completedLessonIds];
    if (!newCompletedLessons.includes(currentLesson._id)) {
      newCompletedLessons.push(currentLesson._id);
    }

    await updateProgress({
      xp: newXp,
      streak: newStreak,
      completedLessonIds: newCompletedLessons,
    });

    if (activeAttemptId) {
      await finalizeAttempt({
        attemptId: activeAttemptId as Id<"lessonAttempts">,
        score: finalScore || 0,
      });
    }

    setShowReview(false);
    setReviewAnimate(false);
    setCurrentLesson(null);
    setSelectedAnswers([]);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setQuestionStartedAt(Date.now());
    setActiveAttemptId(null);
  };

  const handleResetProgress = async () => {
    if (
      confirm(
        "Are you sure you want to reset all progress? This cannot be undone.",
      )
    ) {
      await resetProgress();
    }
  };

  const exportData = () => {
    const data = {
      progress: { xp, streak, completedLessonIds },
      lessons: lessons?.map((l) => ({
        title: l.title,
        description: l.description,
        difficulty: l.difficulty,
        xpReward: l.xpReward,
        questions: l.questions,
      })),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polymer-chemistry-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLessonStatus = (lessonId: Id<"lessons">) => {
    return completedLessonIds.includes(lessonId) ? "completed" : "available";
  };

  const TailwindSafelist = () => (
    <div className="hidden">
      <div className="bg-indigo-100 border-indigo-100 hover:border-indigo-500 text-indigo-600 text-indigo-900 group-hover:bg-indigo-600 hover:border-indigo-300 text-indigo-700" />
      <div className="bg-pink-100 border-pink-100 hover:border-pink-500 text-pink-600 text-pink-900 group-hover:bg-pink-600 hover:border-pink-300 text-pink-700" />
      <div className="bg-blue-100 border-blue-100 hover:border-blue-500 text-blue-600 text-blue-900 group-hover:bg-blue-600 hover:border-blue-300 text-blue-700" />
      <div className="bg-emerald-100 border-emerald-100 hover:border-emerald-500 text-emerald-600 text-emerald-900 group-hover:bg-emerald-600 hover:border-emerald-300 text-emerald-700" />
      <div className="bg-amber-100 border-amber-100 hover:border-amber-500 text-amber-600 text-amber-900 group-hover:bg-amber-600 hover:border-amber-300 text-amber-700" />
      <div className="bg-violet-100 border-violet-100 hover:border-violet-500 text-violet-600 text-violet-900 group-hover:bg-violet-600 hover:border-violet-300 text-violet-700" />
      <div className="bg-rose-100 border-rose-100 hover:border-rose-500 text-rose-600 text-rose-900 group-hover:bg-rose-600 hover:border-rose-300 text-rose-700" />
    </div>
  );

  const allModules = (modules && modules.length > 0 ? modules : DEFAULT_MODULES)
    .slice()
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const iconForModule = (iconKey?: string) => {
    if (iconKey === "beaker") return Beaker;
    if (iconKey === "bookOpen") return BookOpen;
    return Atom;
  };

  // ========================================
  // 8. UI RENDERING
  // ========================================
  if (
    lessons === undefined ||
    userProgress === undefined ||
    modules === undefined
  ) {
    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  // --- SETTINGS ---
  if (showSettings) {
    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto pb-24 md:pb-0">
          <Button
            variant="outline"
            onClick={() => setShowSettings(false)}
            className="mb-6"
          >
            ← Back to Lessons
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-6 h-6" /> Settings & Data Management
              </CardTitle>
              <CardDescription>
                Manage your learning data and progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Export Data</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Download all your progress and lessons as a JSON file for
                  backup.
                </p>
                <Button
                  onClick={exportData}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Export Data
                </Button>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Reset Progress</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Clear all progress and start fresh. Lessons will be preserved.
                </p>
                <Button
                  onClick={handleResetProgress}
                  className="w-full"
                  variant="destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset All Progress
                </Button>
              </div>
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Current Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total XP:</span>
                    <span className="font-semibold">{xp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Streak:</span>
                    <span className="font-semibold">{streak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Lessons:</span>
                    <span className="font-semibold">
                      {completedLessonIds.length} / {lessons?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t mt-4">
                <h3 className="font-semibold mb-2 text-slate-800">
                  Instructor Access
                </h3>
                {isAdmin ? (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Welcome back, Professor.
                    </p>
                    <Button
                      onClick={() => router.push("/teacher")}
                      className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Open Teacher
                      Dashboard
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Contact the department head for instructor access
                    permissions.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <audio ref={correctSound} src="/sounds/correct.mp3" preload="auto" />
        <audio ref={wrongSound} src="/sounds/incorrect.mp3" preload="auto" />
      </div>
    );
  }

  // --- GLOSSARY ---
  if (showGlossary) {
    return (
      <GlossaryView
        terms={glossaryTerms}
        onClose={() => setShowGlossary(false)}
      />
    );
  }

  // --- LESSON/QUIZ ---
  if (currentLesson) {
    if (showReview) {
      const finalScore = computeFinalScore();
      const earnedXPPreview = Math.round(
        ((finalScore || 0) / currentLesson.questions.length) *
          currentLesson.xpReward,
      );
      return (
        <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
          <div className="max-w-2xl mx-auto pb-24 md:pb-0">
            <div className="mb-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => hideReview()}>
                ← Back to Quiz
              </Button>
              <div className="flex items-center gap-4 mr-10 md:mr-0">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="font-bold">{streak}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold">
                    {finalScore}/{currentLesson.questions.length}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`transform transition-all duration-200 ease-out ${reviewAnimate ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"}`}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Lesson Review</CardTitle>
                  <CardDescription>
                    Quick summary of your answers and what you'll earn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-lg font-semibold">
                      Score: {finalScore} / {currentLesson.questions.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      Earned XP (preview): +{earnedXPPreview} XP
                    </p>
                  </div>
                  <div className="space-y-3 mb-4">
                    {currentLesson.questions.map((q: any, idx: number) => {
                      const userAns = selectedAnswers[idx];
                      const isCorrect =
                        q.type === "dragdrop"
                          ? evaluateDragDropCorrectness(q, userAns)
                          : q.type === "fillblank"
                            ? String(userAns || "")
                                .trim()
                                .toLowerCase() ===
                              String(q.correctAnswer || "")
                                .trim()
                                .toLowerCase()
                            : userAns === q.correct;
                      return (
                        <AnswerBreakdownCard
                          key={idx}
                          index={idx}
                          question={q}
                          studentAnswer={userAns}
                          isCorrect={isCorrect}
                        />
                      );
                    })}
                  </div>
                  <Button
                    onClick={completeLesson}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg h-12"
                  >
                    Complete Lesson
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    const question = currentLesson.questions[currentQuestion];
    let isCorrectForUI = false;
    if (question.type === "dragdrop") {
      isCorrectForUI = evaluateDragDropCorrectness(
        question,
        selectedAnswers[currentQuestion],
      );
    } else if (question.type === "fillblank") {
      isCorrectForUI =
        String(selectedAnswers[currentQuestion] || "")
          .trim()
          .toLowerCase() ===
        String(question.correctAnswer || "")
          .trim()
          .toLowerCase();
    } else {
      isCorrectForUI = selectedAnswers[currentQuestion] === question.correct;
    }

    const progress =
      ((currentQuestion + 1) / currentLesson.questions.length) * 100;
    const hasQuestionImage = !!question.imageUrl;
    const showQuestionImage =
      hasQuestionImage && !failedQuestionImages.has(question.imageUrl);

    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto pb-24 md:pb-0">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrentLesson(null)}>
              ← Back
            </Button>
            <div className="flex items-center gap-4 mr-10 md:mr-0">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold">{streak}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">
                  {score}/{currentLesson.questions.length}
                </span>
              </div>
            </div>
          </div>

          <Progress value={progress} className="mb-6" />

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <ExplainerText text={question.question} />
                <div
                  onClick={() => speak(question.question)}
                  className="p-2 rounded-full hover:bg-indigo-100 text-indigo-400 transition-colors cursor-pointer"
                  title="Read question aloud"
                >
                  <Volume2 className="w-5 h-5" />
                </div>
              </CardTitle>
              <CardDescription>
                Question {currentQuestion + 1} of{" "}
                {currentLesson.questions.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showQuestionImage && (
                <div className="mb-6 flex justify-center bg-white rounded-xl border border-indigo-50 overflow-hidden shadow-sm p-4">
                  <img
                    src={question.imageUrl}
                    alt="Diagram for question"
                    crossOrigin="anonymous"
                    style={{
                      maxHeight: "256px",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      setFailedQuestionImages((prev) => {
                        const next = new Set(prev);
                        if (question.imageUrl) next.add(question.imageUrl);
                        return next;
                      });
                    }}
                  />
                </div>
              )}
              {hasQuestionImage && !showQuestionImage && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  The diagram for this question could not be loaded. You can
                  still answer the question.
                </div>
              )}

              <div className="space-y-3 mb-6">
                {(question.type ?? "mcq") === "dragdrop" ? (
                  <DragDropStudentQuestion
                    question={question}
                    studentAnswer={selectedAnswers[currentQuestion] || null}
                    setStudentAnswer={(ans) => {
                      const updated = [...selectedAnswers];
                      updated[currentQuestion] = ans;
                      setSelectedAnswers(updated);
                    }}
                    disabled={showResult}
                    onReadItem={speak}
                  />
                ) : question.type === "fillblank" ? (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Type your answer here..."
                      className={`w-full p-4 border-2 rounded-lg transition-all text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        showResult
                          ? isCorrectForUI
                            ? "border-green-500 bg-green-50 text-green-900"
                            : "border-red-500 bg-red-50 text-red-900"
                          : "border-gray-200 focus:border-indigo-500"
                      }`}
                      value={selectedAnswers[currentQuestion] || ""}
                      onChange={(e) => {
                        if (!showResult) {
                          const val = e.target.value;
                          setSelectedAnswer(val);
                          setSelectedAnswers((prev) => {
                            const next = [...prev];
                            next[currentQuestion] = val;
                            return next;
                          });
                        }
                      }}
                      disabled={showResult}
                    />
                  </div>
                ) : (
                  question.options?.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSubmit(index)} // Just selects, doesn't check
                      disabled={showResult}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all disabled:cursor-not-allowed ${
                        selectedAnswers[currentQuestion] === index
                          ? showResult
                            ? index === question.correct
                              ? "border-green-500 bg-green-50" // Correct highlight
                              : "border-red-500 bg-red-50" // Incorrect highlight
                            : "border-indigo-500 bg-indigo-50" // Selected highlight
                          : showResult && index === question.correct
                            ? "border-green-500 bg-green-50" // Reveal correct answer
                            : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResult && index === question.correct && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                        {showResult &&
                          selectedAnswers[currentQuestion] === index &&
                          index !== question.correct && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {showResult && (
                <Alert
                  className={
                    isCorrectForUI
                      ? "bg-green-50 border-green-200 mt-4"
                      : "bg-red-50 border-red-200 mt-4"
                  }
                >
                  <AlertDescription>
                    <div className="flex items-start gap-2">
                      {isCorrectForUI ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold mb-1">
                          {isCorrectForUI ? "Correct!" : "Not quite right"}
                        </p>
                        <p className="text-sm">{question.explanation}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex justify-end">
                {/* Submit Button visible when answer is picked but not yet checked */}
                {!showResult && (
                  <Button
                    onClick={() => {
                      const studentAns = selectedAnswers[currentQuestion];
                      let isCorrect = false;

                      if (question.type === "dragdrop") {
                        isCorrect = evaluateDragDropCorrectness(
                          question,
                          studentAns,
                        );
                      } else if (question.type === "fillblank") {
                        isCorrect =
                          String(studentAns || "")
                            .trim()
                            .toLowerCase() ===
                          String(question.correctAnswer || "")
                            .trim()
                            .toLowerCase();
                      } else {
                        isCorrect = studentAns === question.correct;
                      }

                      triggerCheckAnswer(studentAns, isCorrect);
                    }}
                    // Disable if no MCQ option is picked, no D&D items are moved, or text input is empty
                    disabled={
                      selectedAnswers[currentQuestion] === null ||
                      (question.type === "fillblank" &&
                        String(
                          selectedAnswers[currentQuestion] || "",
                        ).trim() === "")
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </Button>
                )}

                {/* Next Question / Review button shown AFTER checking */}
                {showResult && (
                  <Button
                    onClick={nextQuestion}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {currentQuestion < currentLesson.questions.length - 1
                      ? "Next Question"
                      : "Review Answers"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
      <TailwindSafelist />
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        <div className="text-center mb-8">
          <div className="relative flex items-center justify-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-indigo-900">
              PolymerLearn
            </h1>
            <Button
              variant="ghost"
              onClick={() => setShowSettings(true)}
              className="hidden md:block absolute right-0"
            >
              <Settings className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowGlossary(true)}
              className="hidden md:block absolute right-12"
              title="Glossary"
            >
              <Book className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Queen Mary University of London
          </p>
        </div>

        {!selectedModuleId && !currentLesson && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Card className="border-indigo-100 shadow-sm bg-white">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {userProgress?.xp || 0}
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Total XP
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-100 shadow-sm bg-white">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                    <Flame className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {userProgress?.streak || 1}
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Day Streak
                  </p>
                </CardContent>
              </Card>
              <Card className="border-green-100 shadow-sm bg-white">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {userProgress?.completedLessonIds?.length || 0}
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Completed
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={() => setShowLeaderboard(true)}
                className="w-full bg-white border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 h-14 text-lg font-bold shadow-sm transition-all flex items-center justify-between px-6"
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <span>View Class Rankings</span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-300" />
              </Button>
            </div>
            <div className="text-center mt-8">
              <h2 className="text-2xl font-bold text-indigo-900">
                Select Your Course
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 pb-20">
              {allModules.map((course: any) => {
                const Icon = iconForModule(course.iconKey);
                const lessonCount =
                  lessons?.filter((l: any) => l.section === course.moduleKey)
                    .length || 0;
                return (
                  <div
                    key={course.moduleKey}
                    onClick={() => setSelectedModuleId(course.moduleKey)}
                    className={`cursor-pointer group bg-white p-8 rounded-2xl border-2 border-${course.color}-100 hover:border-${course.color}-500 hover:shadow-xl transition-all duration-200`}
                  >
                    <div
                      className={`h-16 w-16 bg-${course.color}-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-${course.color}-600 transition-colors`}
                    >
                      <Icon
                        className={`w-8 h-8 text-${course.color}-600 group-hover:text-white`}
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {course.code}
                    </h2>
                    <h3
                      className={`text-lg font-medium text-${course.color}-900 mb-3`}
                    >
                      {course.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {course.description}
                    </p>
                    <span
                      className={`text-sm font-semibold text-${course.color}-600 group-hover:translate-x-1 inline-block transition-transform`}
                    >
                      {lessonCount > 0
                        ? `View ${lessonCount} Lessons →`
                        : "Coming Soon"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedModuleId && !currentLesson && (
          <div>
            <button
              onClick={() => setSelectedModuleId(null)}
              className="flex items-center text-gray-500 hover:text-indigo-600 mb-6 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Book className="w-6 h-6" />{" "}
              {allModules.find((m: any) => m.moduleKey === selectedModuleId)
                ?.code || selectedModuleId}
              :{" "}
              {allModules.find((m: any) => m.moduleKey === selectedModuleId)
                ?.title || ""}
            </h2>
            <div className="space-y-4">
              {lessons
                ?.filter((lesson: any) => lesson.section === selectedModuleId)
                .sort((a: any, b: any) => a.order - b.order)
                .map((lesson: any) => {
                  const status = getLessonStatus(lesson._id);
                  const themeColor =
                    allModules.find(
                      (m: any) => m.moduleKey === selectedModuleId,
                    )?.color || "indigo";
                  return (
                    <Card
                      key={lesson._id}
                      className={`cursor-pointer transition-all hover:shadow-lg group ${status === "completed" ? "border-green-200 bg-green-50" : `hover:border-${themeColor}-300`}`}
                      onClick={() => void startLesson(lesson)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle
                              className={`flex items-center gap-2 hover:text-${themeColor}-700 transition-colors`}
                            >
                              {lesson.title}
                              {status === "completed" && (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                            </CardTitle>
                            <CardDescription>
                              {lesson.description}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-${themeColor}-100 text-${themeColor}-700`}
                            >
                              {lesson.difficulty}
                            </span>
                            <p className="text-sm text-gray-600 mt-2">
                              +{lesson.xpReward} XP
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
            </div>
            {lessons?.filter((l: any) => l.section === selectedModuleId)
              .length === 0 && (
              <div className="text-center p-12 mt-8 border-2 border-dashed rounded-xl">
                <p className="text-gray-500">
                  No lessons found for{" "}
                  {allModules.find((m: any) => m.moduleKey === selectedModuleId)
                    ?.code || selectedModuleId}
                  .
                </p>
                <Button onClick={() => window.location.reload()} variant="link">
                  Reload Page
                </Button>
              </div>
            )}
          </div>
        )}

        {showLeaderboard && (
          <StudentLeaderboard onClose={() => setShowLeaderboard(false)} />
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-around items-center md:hidden z-50 pb-safe">
          <button
            onClick={() => setSelectedModuleId(null)}
            className="flex flex-col items-center text-indigo-600"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => setShowGlossary(true)}
            className="flex flex-col items-center text-gray-500 hover:text-indigo-600"
          >
            <Book className="w-6 h-6" />
            <span className="text-xs font-medium">Glossary</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center text-gray-500 hover:text-indigo-600"
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
// ── GlossaryView ─────────────────────────────────────────────────────────────

/**
 * Read-only glossary screen. Fetches all terms via `api.glossary.getAll` and
 * filters them client-side. Alphabetical order is preserved from the backend
 * `by_term` index. Shows a loading spinner while data is loading and a
 * "No terms found" message when the filtered list is empty.
 */
function GlossaryView({
  terms,
  onClose,
}: {
  terms: any[] | undefined;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = terms !== undefined ? filterGlossaryTerms(terms, searchQuery) : undefined;

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto pb-24 md:pb-0">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            ← Back to Lessons
          </Button>
          <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
            <Book className="w-5 h-5" /> Glossary
          </h1>
          <div className="w-28" /> {/* spacer */}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Loading */}
        {terms === undefined && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* No terms found */}
        {filtered !== undefined && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Book className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No terms found.</p>
          </div>
        )}

        {/* Term list */}
        {filtered !== undefined && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((t: any) => (
              <div key={t._id} className="rounded-lg border border-slate-100 bg-white p-4">
                <p className="font-semibold text-slate-800 text-sm">{t.term}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{t.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AnswerBreakdownCard ───────────────────────────────────────────────────────

interface AnswerBreakdownCardProps {
  index: number;
  question: any;
  studentAnswer: any;
  isCorrect: boolean;
}

/**
 * Renders a single per-question card on the Review Screen.
 * Shows: question number + text, correct/incorrect status, student answer,
 * correct answer, and explanation (omitted when empty/missing).
 * Supports mcq, fillblank, and dragdrop question types.
 */
function AnswerBreakdownCard({ index, question, studentAnswer, isCorrect }: AnswerBreakdownCardProps) {
  // ── Student answer display ──────────────────────────────────────────────────
  let studentAnswerDisplay: React.ReactNode;
  if (question.type === "fillblank") {
    const text = String(studentAnswer ?? "").trim();
    studentAnswerDisplay = text || <span className="italic text-slate-400">No answer submitted</span>;
  } else if (question.type === "dragdrop") {
    if (!studentAnswer || !Array.isArray(studentAnswer)) {
      studentAnswerDisplay = <span className="italic text-slate-400">No answer submitted</span>;
    } else {
      studentAnswerDisplay = (
        <ul className="space-y-0.5">
          {(studentAnswer as any[]).map((sec: any, i: number) => (
            <li key={i} className="text-xs">
              <span className="font-semibold">{sec.name}:</span>{" "}
              {(sec.answers || []).map((a: any) => (typeof a === "string" ? a : a.text)).join(", ") || <span className="italic text-slate-400">empty</span>}
            </li>
          ))}
        </ul>
      );
    }
  } else {
    // mcq
    studentAnswerDisplay =
      studentAnswer !== null && studentAnswer !== undefined
        ? question.options?.[studentAnswer as number] ?? <span className="italic text-slate-400">No answer submitted</span>
        : <span className="italic text-slate-400">No answer submitted</span>;
  }

  // ── Correct answer display ──────────────────────────────────────────────────
  let correctAnswerDisplay: React.ReactNode;
  if (question.type === "fillblank") {
    correctAnswerDisplay = question.correctAnswer ?? "-";
  } else if (question.type === "dragdrop") {
    correctAnswerDisplay = (
      <ul className="space-y-0.5">
        {(question.sections || []).map((sec: any, i: number) => (
          <li key={i} className="text-xs">
            <span className="font-semibold">{sec.name}:</span>{" "}
            {(sec.answers || []).join(", ")}
          </li>
        ))}
      </ul>
    );
  } else {
    correctAnswerDisplay = question.options?.[question.correct] ?? "-";
  }

  const explanation = question.explanation?.trim();

  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
      {/* 1. Question number + text */}
      <p className="font-semibold text-sm text-slate-800">
        <span className="text-slate-400 font-normal mr-1">Q{index + 1}.</span>
        {question.question}
      </p>

      {/* 2. Status icon */}
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        )}
        <span className={`text-xs font-semibold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
          {isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      {/* 3. Student answer */}
      <div className={`rounded-md px-3 py-2 text-sm border ${isCorrect ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-900"}`}>
        <p className="text-xs font-semibold mb-0.5 opacity-70">Your answer</p>
        {studentAnswerDisplay}
      </div>

      {/* 4. Correct answer */}
      <div className="rounded-md px-3 py-2 text-sm border bg-green-50 border-green-200 text-green-900">
        <p className="text-xs font-semibold mb-0.5 opacity-70 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Correct answer
        </p>
        {correctAnswerDisplay}
      </div>

      {/* 5. Explanation — omitted when empty */}
      {explanation && (
        <div className="rounded-md px-3 py-2 text-sm border bg-indigo-50 border-indigo-100 text-indigo-900">
          <p className="text-xs font-semibold mb-0.5 opacity-70">Explanation</p>
          {explanation}
        </div>
      )}
    </div>
  );
}

export default PolymerChemistryApp;

