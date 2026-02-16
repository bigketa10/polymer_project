import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 0. MODULES TABLE (Courses / Modules shown on homepage)
  modules: defineTable({
    moduleKey: v.string(), // stable string id used by lessons.section (e.g. "qxu5031")
    code: v.string(), // display code (e.g. "QXU5031")
    title: v.string(),
    description: v.string(),
    color: v.string(), // tailwind color name (e.g. "indigo", "pink")
    iconKey: v.string(), // "bookOpen" | "beaker" | "atom"
    order: v.number(),
    isDefault: v.boolean(),
  })
    .index("by_key", ["moduleKey"])
    .index("by_default", ["isDefault"]),

  // 1. LESSONS TABLE (Fixed: Added 'section')
  lessons: defineTable({
    title: v.string(),
    description: v.string(),
    difficulty: v.string(),
    xpReward: v.number(),
    isDefault: v.boolean(),
    order: v.number(),
    userId: v.optional(v.string()),

    // This was causing your "Extra field section" error
    section: v.optional(v.string()),

    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correct: v.number(),
        explanation: v.string(),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
      }),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_default", ["isDefault"]),

  // 2. USER PROGRESS TABLE (Fixed: Added 'lastUpdated')
  userProgress: defineTable({
    userId: v.string(),
    userName: v.optional(v.string()),
    xp: v.number(),
    streak: v.number(),
    lastLoginDate: v.optional(v.string()),
    completedLessonIds: v.array(v.id("lessons")),

    // This fixes the 'lastUpdated does not exist' error
    lastUpdated: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // 2b. LESSON ATTEMPTS TABLE (Per-lesson answer history)
  lessonAttempts: defineTable({
    userId: v.string(),
    lessonId: v.id("lessons"),
    startedAt: v.string(),
    updatedAt: v.string(),
    completedAt: v.optional(v.string()),
    score: v.optional(v.number()),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        selectedOption: v.union(v.number(), v.null()),
        isCorrect: v.boolean(),
      }),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_lesson", ["lessonId"]),

  // 3. MESSAGES TABLE (Fixed: Added missing table)
  // This fixes the 'Argument "messages" is not assignable' error
  messages: defineTable({
    userId: v.string(),
    body: v.string(),
    format: v.optional(v.string()),
  }),
});
