import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    userId: v.string(),
    body: v.string(),
  }),

  userProgress: defineTable({
    userId: v.string(),
    xp: v.number(),
    streak: v.number(),
    // CHANGE: Store the actual Convex IDs of lessons completed, not just a number
    completedLessonIds: v.array(v.id("lessons")),
    lastUpdated: v.string(),
  }).index("by_user", ["userId"]),

  lessons: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    difficulty: v.string(),
    xpReward: v.number(),
    // NEW: Essential for Duolingo "Path" logic (Lesson 1 -> Lesson 2)
    order: v.number(),

    questions: v.array(
      v.object({
        question: v.string(),
        // NEW: Add support for chemical images/diagrams
        imageUrl: v.optional(v.string()),
        options: v.array(v.string()),
        correct: v.number(), // Index of correct option (0-3)
        explanation: v.string(),
      })
    ),
    isDefault: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_default", ["isDefault"])
    // NEW: fast lookup to sort lessons by their learning order
    .index("by_order", ["order"]),
});
