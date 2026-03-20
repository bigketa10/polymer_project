"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sortLeaderboard, filterStudents, buildStudentReport } from "@/lib/teacherUtils";
import { useToast } from "@/components/teacher/useToast";
import { ToastContainer } from "@/components/teacher/InlineToast";
import { ConfirmDialog } from "@/components/teacher/ConfirmDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(dt: string | number | undefined | null): string {
  if (!dt) return "-";
  const date = new Date(dt as string);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDurationMs(value?: number): string {
  if (typeof value !== "number" || isNaN(value) || value < 0) return "-";
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes <= 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

function formatResponseTimestamp(timestamp: string): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}


// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AnalyticsDashboard — teacher analytics page rendered at `/teacher/analytics`.
 *
 * Displays class-level stats (total students, average XP, at-risk count, lesson
 * count), a searchable/sortable student leaderboard, a per-student report panel
 * with expandable question-level detail, and a per-lesson aggregate response
 * distribution view. Fetches all data via Convex hooks; accepts no props.
 *
 * Uses `useToast` + `ToastContainer` for inline success/error feedback and
 * `ConfirmDialog` for the destructive "Reset all progress" action — no
 * `window.alert` or `window.confirm` calls.
 */
export function AnalyticsDashboard() {
  const { user } = useUser();
  const { toasts, toast, dismiss } = useToast();

  const resetAllProgress = useMutation(api.teachers.resetAllStudentProgress);

  const stats = useQuery(api.teachers.getClassStats, user ? {} : "skip");
  const lessons = useQuery(api.lessons.getAll);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [studentReportAttemptFilter, setStudentReportAttemptFilter] = useState<string>("all");
  const [expandedReportLessons, setExpandedReportLessons] = useState<Set<string>>(new Set());
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [responseModalQuestionIndex, setResponseModalQuestionIndex] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const studentAttempts = useQuery(
    api.lessonAttempts.getByUser,
    selectedStudentUserId && user ? { userId: selectedStudentUserId } : "skip",
  );

  const selectedLessonAttempts = useQuery(
    api.lessonAttempts.getByLesson,
    selectedLessonId && user ? { lessonId: selectedLessonId as Id<"lessons"> } : "skip",
  );

  // ── Derived data ─────────────────────────────────────────────────────────────

  const reportLessons = useMemo(() => {
    if (!studentAttempts || !lessons) return [];
    return buildStudentReport(studentAttempts as any[], lessons as any[]);
  }, [studentAttempts, lessons]);

  const reportAttemptOptions = useMemo(() => {
    if (!studentAttempts || !lessons) return [];
    const lessonMap = new Map<string, any>();
    for (const lesson of lessons as any[]) lessonMap.set(String(lesson._id), lesson);
    return (studentAttempts as any[])
      .map((attempt) => {
        const lesson = lessonMap.get(String(attempt.lessonId));
        return lesson ? { attempt, lesson } : null;
      })
      .filter((v): v is { attempt: any; lesson: any } => v !== null)
      .sort((a, b) => {
        const aTime = a.attempt.updatedAt || a.attempt.completedAt || a.attempt.startedAt || "";
        const bTime = b.attempt.updatedAt || b.attempt.completedAt || b.attempt.startedAt || "";
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
    return [{
      lesson: selected.lesson,
      latestAttempt: selected.attempt,
      attemptCount: matchingLesson?.attemptCount || 1,
    }];
  }, [reportLessons, reportAttemptOptions, studentReportAttemptFilter]);

  const studentNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of stats?.leaderboard || []) {
      map.set(student.userId, student.userName || "Anonymous User");
    }
    return map;
  }, [stats]);

  const lessonResponsesByQuestion = useMemo(() => {
    const map = new Map<number, any[]>();
    if (!selectedLessonAttempts) return map;
    const sorted = (selectedLessonAttempts as any[]).slice().sort((a, b) => {
      const aTime = a.completedAt || a.updatedAt || a.startedAt || "";
      const bTime = b.completedAt || b.updatedAt || b.startedAt || "";
      return bTime.localeCompare(aTime);
    });
    for (const attempt of sorted) {
      const submittedAt = attempt.completedAt || attempt.updatedAt || attempt.startedAt || "";
      for (const ans of attempt.answers || []) {
        const list = map.get(ans.questionIndex) ?? [];
        list.push({
          userId: attempt.userId,
          selectedOption: ans.selectedOption ?? null,
          textAnswer: ans.textAnswer,
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

  const filteredLeaderboard = useMemo(() => {
    if (!stats) return [];
    return filterStudents(sortLeaderboard(stats.leaderboard as any[]), searchQuery);
  }, [stats, searchQuery]);

  const selectedLesson = useMemo(
    () => (lessons as any[] | undefined)?.find((l) => l._id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );


  // ── Handlers ─────────────────────────────────────────────────────────────────

  const selectStudent = (userId: string, name: string) => {
    setSelectedStudentUserId(userId);
    setSelectedStudentName(name);
    setStudentReportAttemptFilter("all");
    setExpandedReportLessons(new Set());
  };

  const closeStudentReport = () => {
    setSelectedStudentUserId(null);
    setSelectedStudentName("");
  };

  const toggleLessonExpanded = (lessonKey: string) => {
    setExpandedReportLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonKey)) next.delete(lessonKey);
      else next.add(lessonKey);
      return next;
    });
  };

  const formatResponseName = (userId: string) => {
    const name = (studentNameByUserId.get(userId) || "Anonymous User").trim();
    return `${name} (${userId.slice(0, 8)}...)`;
  };

  const handleResetAllProgress = async () => {
    try {
      await resetAllProgress({});
      setSelectedStudentUserId(null);
      setSelectedStudentName("");
      toast("success", "All student progress has been reset.");
    } catch (e: any) {
      toast("error", e?.message || "Failed to reset progress.");
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-3 lg:p-4 space-y-4">

      <ConfirmDialog
        open={confirmReset}
        title="Reset all student progress"
        description="This will permanently delete all XP, streaks, completed lessons, and attempt history for every student. This cannot be undone."
        destructive
        onConfirm={() => { setConfirmReset(false); void handleResetAllProgress(); }}
        onCancel={() => setConfirmReset(false)}
      />

      {/* ── Class Stats ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-slate-900">Analytics</h1>
        <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset all progress
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500">Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalStudents}</p>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500">Avg XP</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.avgXP}</p>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500">At Risk</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.strugglingStudents}</p>
              </div>
              <div className="p-1.5 bg-amber-50 rounded-lg"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500">Lessons</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalLessonsCount}</p>
              </div>
              <div className="p-1.5 bg-violet-50 rounded-lg"><BookOpen className="w-4 h-4 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* ── Two-column: leaderboard + student report ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Left: Leaderboard */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Student Leaderboard</CardTitle>
                <CardDescription>Click a student to view their report</CardDescription>
              </div>
              <div className="relative w-48 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Search by name..."
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
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">XP</th>
                  <th className="px-2 py-2 font-medium">🔥</th>
                  <th className="px-2 py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                      No students found.
                    </td>
                  </tr>
                )}
                {filteredLeaderboard.map((student: any, rank: number) => {
                  const isSelected = selectedStudentUserId === student.userId;
                  return (
                    <tr
                      key={student.id}
                      onClick={() => selectStudent(student.userId, student.userName)}
                      className={`border-b cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? "bg-indigo-50" : "bg-white"}`}
                    >
                      <td className="px-2 py-2 text-slate-400 text-xs font-mono">{rank + 1}</td>
                      <td className="px-2 py-2 font-semibold text-slate-800 text-xs">{student.userName}</td>
                      <td className="px-2 py-2 font-bold text-indigo-600 text-xs">{student.xp}</td>
                      <td className="px-2 py-2 text-xs text-slate-600">{student.streak}</td>
                      <td className="px-2 py-2">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[60px]">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${student.progressPercent}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 inline-block">
                          {student.completedCount}/{stats.totalLessonsCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>


        {/* Right: Student Report */}
        <div>
          {!selectedStudentUserId ? (
            <Card className="shadow-sm flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center text-slate-400 py-12">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a student to view their report</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Student Report</CardTitle>
                    <CardDescription>{selectedStudentName} · Latest attempt per lesson</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeStudentReport}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
                {!studentAttempts && <p className="text-sm text-slate-400">Loading report...</p>}
                {studentAttempts && reportLessons.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No attempted lessons yet.</p>
                )}
                {studentAttempts && reportLessons.length > 0 && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-600">Filter by attempt</label>
                      <select
                        value={studentReportAttemptFilter}
                        onChange={(e) => { setStudentReportAttemptFilter(e.target.value); setExpandedReportLessons(new Set()); }}
                        className="h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Latest attempt per lesson</option>
                        {reportAttemptOptions.map(({ lesson, attempt }) => {
                          const t = attempt.updatedAt || attempt.completedAt || attempt.startedAt || "";
                          return (
                            <option key={String(attempt._id)} value={String(attempt._id)}>
                              {lesson.title} — {formatResponseTimestamp(t)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {displayedStudentReportLessons.length === 0 && (
                      <p className="text-sm text-slate-400 italic">No report for selected attempt.</p>
                    )}
                    {displayedStudentReportLessons.map(({ lesson, latestAttempt, attemptCount }) => {
                      const answerMap = new Map<number, any>();
                      for (const ans of latestAttempt.answers || []) answerMap.set(ans.questionIndex, ans);
                      const totalQ = typeof latestAttempt.totalQuestions === "number" ? latestAttempt.totalQuestions : lesson.questions?.length || 0;
                      const answeredQ = typeof latestAttempt.answeredCount === "number" ? latestAttempt.answeredCount : (latestAttempt.answers || []).length;
                      const pct = typeof latestAttempt.completionPercent === "number" ? latestAttempt.completionPercent : totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
                      const totalMs = typeof latestAttempt.totalTimeMs === "number" ? latestAttempt.totalTimeMs : (latestAttempt.answers || []).reduce((acc: number, a: any) => acc + (a.timeSpentMs || 0), 0);
                      const lessonKey = String(lesson._id);
                      const isExpanded = expandedReportLessons.has(lessonKey);
                      return (
                        <div key={`${lesson._id}:${latestAttempt._id}`} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{lesson.description}</p>
                            </div>
                            <div className="text-xs text-slate-500 text-right shrink-0">
                              <div>Attempts: {attemptCount}</div>
                              <div>{answeredQ}/{totalQ} ({pct}%)</div>
                              <div>{formatDurationMs(totalMs)}</div>
                              <div>{formatDateTime(latestAttempt.updatedAt || latestAttempt.startedAt)}</div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => toggleLessonExpanded(lessonKey)}>
                            {isExpanded
                              ? <><ChevronDown className="w-3.5 h-3.5 mr-1" />Hide questions</>
                              : <><ChevronRight className="w-3.5 h-3.5 mr-1" />Show questions</>}
                          </Button>
                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              {(lesson.questions || []).map((q: any, idx: number) => {
                                const ans = answerMap.get(idx);
                                const isCorrect = ans?.isCorrect ?? false;
                                return (
                                  <div key={idx} className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                                    <p className="text-xs text-slate-400">Q{idx + 1}</p>
                                    <p className="text-sm font-medium text-slate-800">{q.question}</p>
                                    {q.type === "fillblank" ? (
                                      <>
                                        <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Answer:</span> {ans?.textAnswer ?? "No answer"}</p>
                                        <p className="text-xs text-slate-600"><span className="font-semibold">Correct:</span> {q.correctAnswer ?? "-"}</p>
                                      </>
                                    ) : q.type === "dragdrop" ? (
                                      <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Answer:</span> Drag &amp; Drop submitted</p>
                                    ) : (
                                      <>
                                        <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Answer:</span> {ans?.selectedOption != null ? q.options?.[ans.selectedOption] : "No answer"}</p>
                                        <p className="text-xs text-slate-600"><span className="font-semibold">Correct:</span> {q.options?.[q.correct] ?? "-"}</p>
                                      </>
                                    )}
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-xs text-slate-500">Time: {formatDurationMs(ans?.timeSpentMs)}</span>
                                      {ans ? (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                          {isCorrect ? "Correct" : "Incorrect"}
                                        </span>
                                      ) : (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not answered</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>


      {/* ── Per-lesson aggregate response distribution ───────────────────────── */}
      {lessons && (lessons as any[]).length > 0 && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Lesson Response Distribution</CardTitle>
                <CardDescription>Aggregate student responses per question for a selected lesson</CardDescription>
              </div>
              <select
                value={selectedLessonId ?? ""}
                onChange={(e) => { setSelectedLessonId(e.target.value || null); setResponseModalQuestionIndex(null); }}
                className="h-9 rounded-md border border-slate-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
              >
                <option value="">Select a lesson…</option>
                {(lessons as any[]).map((l) => (
                  <option key={l._id} value={l._id}>{l.title}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <div className="p-4">
            {!selectedLessonId && (
              <p className="text-sm text-slate-400 italic">Choose a lesson above to see response data.</p>
            )}
            {selectedLessonId && !selectedLessonAttempts && (
              <p className="text-sm text-slate-400">Loading responses...</p>
            )}
            {selectedLessonId && selectedLessonAttempts && selectedLesson && (
              <div className="space-y-3">
                {(selectedLesson.questions || []).length === 0 && (
                  <p className="text-sm text-slate-400 italic">This lesson has no questions.</p>
                )}
                {(selectedLesson.questions || []).map((q: any, idx: number) => {
                  const responses = lessonResponsesByQuestion.get(idx) || [];
                  const uniquePickersByOption = (q.options || []).map((_: string, optIdx: number) => {
                    const users = new Set<string>();
                    for (const r of responses) { if (r.selectedOption === optIdx) users.add(r.userId); }
                    return users.size;
                  });
                  const noAnswerUsers = new Set<string>();
                  for (const r of responses) {
                    if (r.selectedOption === null && !r.placedSections && !r.textAnswer) noAnswerUsers.add(r.userId);
                  }
                  const isOpen = responseModalQuestionIndex === idx;
                  return (
                    <div key={idx} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">Q{idx + 1}</p>
                          <p className="text-sm font-medium text-slate-800">{q.question}</p>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0"
                          onClick={() => setResponseModalQuestionIndex(isOpen ? null : idx)}>
                          {isOpen ? "Hide" : `Responses (${responses.length})`}
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {q.type === "mcq" ? (
                          <>
                            {(q.options || []).map((opt: string, optIdx: number) => (
                              <p key={optIdx} className="text-xs text-slate-600">
                                <span className="font-semibold">Option {optIdx + 1}:</span>{" "}
                                {uniquePickersByOption[optIdx]} {uniquePickersByOption[optIdx] === 1 ? "person" : "people"}
                                <span className="text-slate-400"> ({opt})</span>
                              </p>
                            ))}
                            {noAnswerUsers.size > 0 && (
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">No answer:</span> {noAnswerUsers.size} {noAnswerUsers.size === 1 ? "person" : "people"}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-600"><span className="font-semibold">Total responses:</span> {responses.length}</p>
                        )}
                      </div>
                      {isOpen && responses.length > 0 && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          {responses.map((response, rIdx) => (
                            <div key={rIdx} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-700">{formatResponseName(response.userId)}</span>
                                <span className="text-slate-400">{formatResponseTimestamp(response.submittedAt)}</span>
                              </div>
                              {q.type === "mcq" ? (
                                <p className="mt-1 text-slate-600">
                                  Answer: {response.selectedOption != null
                                    ? `Option ${response.selectedOption + 1} — ${q.options?.[response.selectedOption] ?? ""}`
                                    : "No answer"}
                                </p>
                              ) : q.type === "fillblank" ? (
                                <p className="mt-1 text-slate-600">Answer: {response.textAnswer ?? "No answer"}</p>
                              ) : (
                                <div className="mt-1 text-slate-600">
                                  {response.placedSections?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {response.placedSections.map((sec: any, sIdx: number) => (
                                        <div key={sIdx} className="border border-indigo-100 rounded bg-indigo-50/30 p-1.5 min-w-[80px]">
                                          <div className="font-semibold text-[10px] text-indigo-900 border-b border-indigo-100 pb-0.5 mb-1">{sec.name}</div>
                                          {sec.answers?.length > 0
                                            ? <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">{sec.answers.map((a: string, aIdx: number) => <li key={aIdx}>{a}</li>)}</ul>
                                            : <span className="text-[10px] italic text-slate-400">Empty</span>}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="italic text-slate-400">No layout saved.</span>
                                  )}
                                </div>
                              )}
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-slate-500">Time: {formatDurationMs(response.timeSpentMs)}</span>
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${response.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {response.isCorrect ? "Correct" : "Incorrect"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
