// Pure helper functions for student UX — independently testable

export interface ProgressRecord {
  userId: string;
  xp: number;
  [key: string]: any;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  [key: string]: any;
}

export interface ModuleRecord {
  moduleKey: string;
  order: number;
  [key: string]: any;
}

export interface LessonRecord {
  section: string;
  [key: string]: any;
}

/**
 * Compute a user's rank: number of users with strictly greater XP + 1.
 * Returns totalStudents + 1 if the user has no record.
 */
export function computeRank(allProgress: ProgressRecord[], userId: string): number {
  const record = allProgress.find((r) => r.userId === userId);
  if (!record) return allProgress.length + 1;
  return allProgress.filter((r) => r.xp > record.xp).length + 1;
}

/**
 * Filter glossary terms by case-insensitive substring match on the `term` field.
 * Returns all terms when query is empty string.
 */
export function filterGlossaryTerms(terms: GlossaryTerm[], query: string): GlossaryTerm[] {
  if (!query) return terms;
  const q = query.toLowerCase();
  return terms.filter((t) => t.term.toLowerCase().includes(q));
}

/**
 * Sort modules ascending by `order` field. Does not mutate the input array.
 */
export function sortModulesByOrder<T extends { order: number }>(modules: T[]): T[] {
  return modules.slice().sort((a, b) => a.order - b.order);
}

/**
 * Map each module to `{ ...module, lessonCount }` where lessonCount is the
 * number of lessons whose `section` matches the module's `moduleKey`.
 */
export function buildCurriculumData<T extends ModuleRecord>(
  modules: T[],
  lessons: LessonRecord[],
): (T & { lessonCount: number })[] {
  return modules.map((m) => ({
    ...m,
    lessonCount: lessons.filter((l) => l.section === m.moduleKey).length,
  }));
}
