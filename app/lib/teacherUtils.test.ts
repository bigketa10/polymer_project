/**
 * Property-based tests for teacherUtils pure helpers.
 * Feature: ux-improvements
 * Uses fast-check with vitest.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sortLeaderboard, filterStudents, buildStudentReport } from "./teacherUtils";
import type { StudentRow, AttemptRow, LessonRow } from "./teacherUtils";

// ── Arbitraries ───────────────────────────────────────────────────────────────

const studentArb = fc.record<StudentRow>({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  userId: fc.string({ minLength: 1, maxLength: 20 }),
  userName: fc.string({ minLength: 1, maxLength: 40 }),
  xp: fc.integer({ min: 0, max: 10000 }),
  streak: fc.integer({ min: 0, max: 365 }),
  completedCount: fc.integer({ min: 0, max: 100 }),
  progressPercent: fc.integer({ min: 0, max: 100 }),
});

const lessonArb = (id?: string) =>
  fc.record({
    _id: id !== undefined ? fc.constant(id) : fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 60 }),
    description: fc.string({ minLength: 0, maxLength: 120 }),
    order: fc.integer({ min: 0, max: 999 }),
    questions: fc.constant([] as unknown[]),
  }) as fc.Arbitrary<LessonRow>;

const attemptArb = (lessonId?: string) =>
  fc.record({
    _id: fc.string({ minLength: 1, maxLength: 20 }),
    userId: fc.string({ minLength: 1, maxLength: 20 }),
    lessonId: lessonId !== undefined ? fc.constant(lessonId) : fc.string({ minLength: 1, maxLength: 20 }),
    startedAt: fc.constant(new Date(0).toISOString()),
    updatedAt: fc.constant(new Date(1000).toISOString()),
    answers: fc.constant([] as unknown[]),
  }) as fc.Arbitrary<AttemptRow>;

// ── Property 5: Leaderboard sorted by XP descending ──────────────────────────

describe("sortLeaderboard", () => {
  /**
   * **Validates: Requirements 3.2**
   * Feature: ux-improvements, Property 5: leaderboard is sorted by XP descending
   */
  it("Property 5 — output is sorted by XP descending for any student list", () => {
    fc.assert(
      fc.property(fc.array(studentArb, { minLength: 0, maxLength: 50 }), (students) => {
        const sorted = sortLeaderboard(students);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].xp).toBeGreaterThanOrEqual(sorted[i + 1].xp);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("does not mutate the original array", () => {
    fc.assert(
      fc.property(fc.array(studentArb, { minLength: 1, maxLength: 20 }), (students) => {
        const original = students.map((s) => s.xp);
        sortLeaderboard(students);
        expect(students.map((s) => s.xp)).toEqual(original);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: Student leaderboard search filters by name ───────────────────

describe("filterStudents", () => {
  /**
   * **Validates: Requirements 3.3**
   * Feature: ux-improvements, Property 6: student leaderboard search filters by name
   */
  it("Property 6 — every result contains the query (case-insensitive)", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 10 }),
        fc.array(studentArb, { minLength: 0, maxLength: 50 }),
        (query, students) => {
          const result = filterStudents(students, query);
          for (const s of result) {
            expect(s.userName.toLowerCase()).toContain(query.toLowerCase());
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 6 — no non-matching student appears in the result", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(studentArb, { minLength: 0, maxLength: 50 }),
        (query, students) => {
          const result = filterStudents(students, query);
          const resultIds = new Set(result.map((s) => s.userId));
          for (const s of students) {
            if (!s.userName.toLowerCase().includes(query.toLowerCase())) {
              expect(resultIds.has(s.userId)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty query returns all students", () => {
    fc.assert(
      fc.property(fc.array(studentArb, { minLength: 0, maxLength: 30 }), (students) => {
        expect(filterStudents(students, "")).toHaveLength(students.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 7: Student report shows only attempted lessons ──────────────────

describe("buildStudentReport", () => {
  /**
   * **Validates: Requirements 3.4, 3.5**
   * Feature: ux-improvements, Property 7: student report shows only attempted lessons
   */
  it("Property 7 — report rows correspond exactly to the set of lessonIds in attempts", () => {
    fc.assert(
      fc.property(
        // Generate a pool of lesson IDs, then build attempts referencing them
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 10 }).chain(
          (lessonIds) => {
            const uniqueIds = [...new Set(lessonIds)];
            const lessonsGen = fc.constant(
              uniqueIds.map((id, i) => ({
                _id: id,
                title: `Lesson ${i}`,
                description: "",
                order: i,
                questions: [],
              })),
            );
            const attemptsGen = fc.array(
              fc.oneof(
                ...uniqueIds.length > 0
                  ? uniqueIds.map((id) => attemptArb(id))
                  : [attemptArb()],
              ),
              { minLength: 0, maxLength: 20 },
            );
            return fc.tuple(attemptsGen, lessonsGen);
          },
        ),
        ([attempts, lessons]) => {
          const report = buildStudentReport(attempts, lessons);

          // Every row in the report must have a lessonId present in attempts
          const attemptedLessonIds = new Set(attempts.map((a) => String(a.lessonId)));
          for (const row of report) {
            expect(attemptedLessonIds.has(String(row.lesson._id))).toBe(true);
          }

          // Every lessonId in attempts that has a matching lesson must appear in the report
          const reportLessonIds = new Set(report.map((r) => String(r.lesson._id)));
          const lessonIdSet = new Set(lessons.map((l) => String(l._id)));
          for (const id of attemptedLessonIds) {
            if (lessonIdSet.has(id)) {
              expect(reportLessonIds.has(id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty attempts produces empty report", () => {
    fc.assert(
      fc.property(fc.array(lessonArb(), { minLength: 0, maxLength: 10 }), (lessons) => {
        expect(buildStudentReport([], lessons)).toHaveLength(0);
      }),
      { numRuns: 50 },
    );
  });

  it("latestAttempt is the most recent one per lesson", () => {
    // Two attempts for the same lesson — the one with the later updatedAt should be latest
    const lessonId = "lesson-1";
    const earlier: AttemptRow = {
      _id: "a1", userId: "u1", lessonId,
      startedAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", answers: [],
    };
    const later: AttemptRow = {
      _id: "a2", userId: "u1", lessonId,
      startedAt: "2024-01-02T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z", answers: [],
    };
    const lesson: LessonRow = { _id: lessonId, title: "L1", description: "", order: 0, questions: [] };
    const report = buildStudentReport([earlier, later], [lesson]);
    expect(report).toHaveLength(1);
    expect(report[0].latestAttempt._id).toBe("a2");
    expect(report[0].attemptCount).toBe(2);
  });
});
