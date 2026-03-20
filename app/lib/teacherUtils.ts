// Pure helper functions for analytics — independently testable

export interface StudentRow {
  id: string;
  userId: string;
  userName: string;
  xp: number;
  streak: number;
  completedCount: number;
  progressPercent: number;
}

export interface LessonRow {
  _id: string;
  title: string;
  description: string;
  order?: number;
  questions?: any[];
  [key: string]: any;
}

export interface AttemptRow {
  _id: string;
  userId: string;
  lessonId: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  score?: number;
  totalQuestions?: number;
  answeredCount?: number;
  completionPercent?: number;
  totalTimeMs?: number;
  answers: any[];
  [key: string]: any;
}

export interface ReportRow {
  lesson: LessonRow;
  latestAttempt: AttemptRow;
  attemptCount: number;
}

/** Sort students by XP descending. */
export function sortLeaderboard(students: StudentRow[]): StudentRow[] {
  return students.slice().sort((a, b) => b.xp - a.xp);
}

/** Filter students by userName (case-insensitive substring match). */
export function filterStudents(students: StudentRow[], query: string): StudentRow[] {
  const q = query.toLowerCase();
  if (!q) return students;
  return students.filter((s) => s.userName.toLowerCase().includes(q));
}

/**
 * Build per-lesson report rows for a student.
 * Returns one row per unique lessonId that appears in attempts,
 * using the most-recent attempt as `latestAttempt`.
 */
export function buildStudentReport(
  attempts: AttemptRow[],
  lessons: LessonRow[],
): ReportRow[] {
  const attemptsByLesson = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const key = String(attempt.lessonId);
    const list = attemptsByLesson.get(key) ?? [];
    list.push(attempt);
    attemptsByLesson.set(key, list);
  }

  const lessonMap = new Map<string, LessonRow>();
  for (const lesson of lessons) {
    lessonMap.set(String(lesson._id), lesson);
  }

  const rows: ReportRow[] = [];
  attemptsByLesson.forEach((lessonAttempts, lessonId) => {
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    const sorted = lessonAttempts.slice().sort((a, b) => {
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

  return rows.sort((a, b) => (a.lesson.order ?? 0) - (b.lesson.order ?? 0));
}
