import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Validator for a single answer within a lesson attempt. This should include all possible answer fields.
const answerValidator = v.object({
  questionIndex: v.number(),
  isCorrect: v.boolean(),
  timeSpentMs: v.optional(v.number()),
  // For MCQ
  selectedOption: v.optional(v.union(v.number(), v.null())),
  // For Fill-in-the-blank
  textAnswer: v.optional(v.string()),
  // For Drag-and-drop
  placedSections: v.optional(
    v.array(
      v.object({
        name: v.string(),
        answers: v.array(v.string()),
      }),
    ),
  ),
  // Added from another definition in the file
  answeredAt: v.optional(v.string()),
});

// Validator for the different types of questions a lesson can have.
const questionValidator = v.union(
  // Multiple Choice Question
  v.object({
    type: v.optional(v.literal("mcq")),
    question: v.string(),
    options: v.array(v.string()),
    correct: v.float64(),
    explanation: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  }),
  // Drag and Drop Question
  v.object({
    type: v.literal("dragdrop"),
    question: v.string(),
    answerBank: v.array(v.string()),
    sections: v.array(
      v.object({
        name: v.string(),
        answers: v.array(v.string()),
      }),
    ),
    explanation: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  }),
  // Fill in the Blank Question (This is the new part)
  v.object({
    type: v.literal("fillblank"),
    question: v.string(),
    correctAnswer: v.string(),
    explanation: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  }),
);

export default defineSchema({
  modules: defineTable({
    moduleKey: v.string(),
    code: v.string(),
    title: v.string(),
    description: v.string(),
    color: v.string(),
    iconKey: v.string(),
    order: v.number(),
    isDefault: v.boolean(),
  })
    .index("by_moduleKey", ["moduleKey"])
    .index("by_default", ["isDefault"]),

  lessons: defineTable({
    title: v.string(),
    description: v.string(),
    difficulty: v.string(),
    xpReward: v.number(),
    order: v.optional(v.number()),
    section: v.optional(v.string()),
    questions: v.optional(v.array(questionValidator)),
    isDefault: v.boolean(),
    userId: v.optional(v.string()),
  })
    .index("by_section", ["section"])
    .index("by_user", ["userId"])
    .index("by_default", ["isDefault"]),

  userProgress: defineTable({
    userId: v.string(),
    userName: v.optional(v.string()),
    xp: v.number(),
    streak: v.number(),
    lastLoginDate: v.optional(v.string()),
    completedLessonIds: v.array(v.id("lessons")),

    lastUpdated: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  lessonAttempts: defineTable({
    userId: v.string(),
    lessonId: v.id("lessons"),
    totalQuestions: v.optional(v.number()),
    answeredCount: v.optional(v.number()),
    completionPercent: v.optional(v.number()),
    totalTimeMs: v.optional(v.number()),
    startedAt: v.string(),
    updatedAt: v.string(),
    completedAt: v.optional(v.string()),
    score: v.optional(v.number()),
    answers: v.array(answerValidator),
  })
    .index("by_user", ["userId"])
    .index("by_lesson", ["lessonId"])
    .index("by_user_lesson", ["userId", "lessonId"]),

  messages: defineTable({
    userId: v.string(),
    body: v.string(),
    format: v.optional(v.string()),
  }),

  glossary: defineTable({
    term: v.string(),
    definition: v.string(),
  }).index("by_term", ["term"]),
});
