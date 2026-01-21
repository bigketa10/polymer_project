"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
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
} from "lucide-react";

const PolymerChemistryApp = () => {
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(
    [],
  );
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewAnimate, setReviewAnimate] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Convex queries and mutations
  const userProgress = useQuery(api.userProgress.get);
  const lessons = useQuery(api.lessons.getAll);
  const updateProgress = useMutation(api.userProgress.update);
  const resetProgress = useMutation(api.userProgress.reset);
  const initializeDefaults = useMutation(api.lessons.initializeDefaults);

  // Initialize default lessons on first load
  useEffect(() => {
    if (!initialized && lessons !== undefined) {
      if (lessons.length === 0) {
        initializeDefaults();
      }
      setInitialized(true);
    }
  }, [lessons, initialized, initializeDefaults]);

  // Trigger entrance animation for review
  useEffect(() => {
    let t: number | undefined;
    if (showReview) {
      t = window.setTimeout(() => setReviewAnimate(true), 20);
    } else {
      setReviewAnimate(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [showReview]);

  const xp = userProgress?.xp || 0;
  const streak = userProgress?.streak || 0;
  const completedLessonIds = userProgress?.completedLessonIds || [];

  const startLesson = (lesson: any) => {
    setCurrentLesson(lesson);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setShowReview(false);
    setReviewAnimate(false);
    setSelectedAnswers(Array(lesson.questions.length).fill(null));
  };

  const handleAnswerSelect = (index: number) => {
    if (!showResult) {
      setSelectedAnswer(index);
      setSelectedAnswers((prev) => {
        const next = [...prev];
        next[currentQuestion] = index;
        return next;
      });
    }
  };

  const checkAnswer = () => {
    setShowResult(true);
    // --- NEW: Play Sound Logic ---
    const question = currentLesson.questions[currentQuestion];
    const userAnswer = selectedAnswers[currentQuestion];
    const isCorrect = userAnswer === question.correct;

    // Create audio objects
    // Note: The path starts with '/' which points to the public folder
    const audio = new Audio(
      isCorrect ? "/sounds/correct.mp3" : "/sounds/wrong.mp3",
    );

    // Play and catch errors (e.g., if user hasn't interacted with page yet)
    audio.play().catch((e) => console.log("Audio play failed:", e));
    const interimScore =
      selectedAnswers?.reduce((acc, ans, idx) => {
        const q = currentLesson?.questions?.[idx];
        if (q && ans === q.correct) {
          return (acc || 0) + 1;
        }
        return acc;
      }, 0) ?? 0;
    setScore(interimScore);
  };

  const nextQuestion = () => {
    if (currentQuestion < currentLesson.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(selectedAnswers[currentQuestion + 1] ?? null);
      setShowResult(false);
    } else {
      setShowReview(true);
    }
  };

  const computeFinalScore = () => {
    if (!currentLesson) return 0;
    return selectedAnswers.reduce((acc, ans, idx) => {
      if (ans === currentLesson.questions[idx].correct) return (acc || 0) + 1;
      return acc;
    }, 0);
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
    const isAlreadyCompleted = newCompletedLessons.some(
      (id) => id === currentLesson._id,
    );

    if (!isAlreadyCompleted) {
      newCompletedLessons.push(currentLesson._id);
    }

    await updateProgress({
      xp: newXp,
      streak: newStreak,
      completedLessonIds: newCompletedLessons,
    });

    setShowReview(false);
    setReviewAnimate(false);
    setCurrentLesson(null);
    setSelectedAnswers([]);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
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
    a.download = `polymer-chemistry-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLessonStatus = (lessonId: string) => {
    return completedLessonIds.some((id) => id === lessonId)
      ? "completed"
      : "available";
  };

  if (lessons === undefined || userProgress === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  // SETTINGS SCREEN
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
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
                <Settings className="w-6 h-6" />
                Settings & Data Management
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
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
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
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Progress
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // LESSON RUNNING + REVIEW
  if (currentLesson) {
    if (showReview) {
      const finalScore = computeFinalScore();
      const earnedXPPreview = Math.round(
        ((finalScore || 0) / currentLesson.questions.length) *
          currentLesson.xpReward,
      );

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => hideReview()}>
                ← Back to Quiz
              </Button>

              <div className="flex items-center gap-4">
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
              className={`transform transition-all duration-200 ease-out ${
                reviewAnimate
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-3 scale-95"
              }`}
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
                      const correctIdx = q.correct;
                      const isCorrect = userAns === correctIdx;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-md border ${
                            isCorrect
                              ? "border-green-200 bg-green-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{q.question}</p>
                              <p className="text-sm text-gray-700 mt-1">
                                Your answer:{" "}
                                <span className="font-semibold">
                                  {userAns === null
                                    ? "No answer"
                                    : q.options[userAns]}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p className="text-sm text-gray-700">
                                  Correct:{" "}
                                  <span className="font-semibold">
                                    {q.options[correctIdx]}
                                  </span>
                                </p>
                              )}
                              <p className="text-sm text-gray-600 mt-2">
                                {q.explanation}
                              </p>
                            </div>
                            <div className="ml-4">
                              {isCorrect ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              ) : (
                                <XCircle className="w-6 h-6 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={() =>
                        hideReview(() => {
                          setSelectedAnswers(
                            Array(currentLesson.questions.length).fill(null),
                          );
                          setSelectedAnswer(null);
                          setCurrentQuestion(0);
                          setShowResult(false);
                          setScore(0);
                        })
                      }
                      variant="outline"
                    >
                      Retry Lesson
                    </Button>

                    <Button
                      onClick={() => hideReview(() => completeLesson())}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Finish and Save Progress
                    </Button>

                    <Button
                      onClick={() =>
                        hideReview(() => {
                          setCurrentLesson(null);
                        })
                      }
                      variant="ghost"
                    >
                      Back to Lessons (Don't Save)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // Normal Quiz UI
    const question = currentLesson.questions[currentQuestion];
    const isCorrect = selectedAnswers[currentQuestion] === question.correct;
    const progress =
      ((currentQuestion + 1) / currentLesson.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrentLesson(null)}>
              ← Back
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold">{streak}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">
                  {computeFinalScore()}/{currentLesson.questions.length}
                </span>
              </div>
            </div>
          </div>

          <Progress value={progress} className="mb-6" />

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{question.question}</CardTitle>
              <CardDescription>
                Question {currentQuestion + 1} of{" "}
                {currentLesson.questions.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {question.options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                    // We keep disabled:cursor-not-allowed, but rely on global CSS for the pointer
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all disabled:cursor-not-allowed ${
                      selectedAnswers[currentQuestion] === index
                        ? showResult
                          ? index === question.correct
                            ? "border-green-500 bg-green-50"
                            : "border-red-500 bg-red-50"
                          : "border-indigo-500 bg-indigo-50"
                        : showResult && index === question.correct
                          ? "border-green-500 bg-green-50"
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
                ))}
              </div>

              {showResult && (
                <Alert
                  className={
                    isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }
                >
                  <AlertDescription>
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold mb-1">
                          {isCorrect ? "Correct!" : "Not quite right"}
                        </p>
                        <p className="text-sm">{question.explanation}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex justify-end">
                {!showResult ? (
                  <Button
                    onClick={checkAnswer}
                    disabled={selectedAnswers[currentQuestion] === null}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </Button>
                ) : (
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

  // MAIN LESSON LIST
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-indigo-900">PolymerLearn</h1>
            <Button variant="ghost" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600">
            Master polymer chemistry, one lesson at a time
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8 max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight mb-0">{xp}</p>
                  <p className="text-sm text-gray-600 mt-0">Total XP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight mb-0">
                    {streak}
                  </p>
                  <p className="text-sm text-gray-600 mt-0">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight mb-0">
                    {completedLessonIds.length}
                  </p>
                  <p className="text-sm text-gray-600 mt-0">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Book className="w-6 h-6" />
          Your Lessons
        </h2>

        <div className="space-y-4">
          {lessons?.map((lesson) => {
            const status = getLessonStatus(lesson._id);
            return (
              <Card
                key={lesson._id}
                // Kept cursor-pointer here because Cards are divs, not buttons
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  status === "completed" ? "border-green-200 bg-green-50" : ""
                }`}
                onClick={() => startLesson(lesson)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {lesson.title}
                        {status === "completed" && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                      </CardTitle>
                      <CardDescription>{lesson.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          lesson.difficulty === "Beginner"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
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
      </div>
    </div>
  );
};

export default PolymerChemistryApp;
