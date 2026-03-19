import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // In a real app, you'd want to check if the user is an admin/teacher
    // to allow them to view other users' progress.
    if (identity.subject !== userId) {
      // This is a simplified auth check. A real app would check a 'roles' table.
      return [];
    }
    return await ctx.db
      .query("lessonAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // Only allow admins (teachers) to see all attempts for a lesson.
    const role = (identity.publicMetadata as any)?.role;
    if (role !== "admin") {
      return [];
    }

    return await ctx.db
      .query("lessonAttempts")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
      .order("desc")
      .collect();
  },
});

export const startOrResumeAttempt = mutation({
  args: { lessonId: v.id("lessons"), forceNew: v.optional(v.boolean()) },
  handler: async (ctx, { lessonId, forceNew }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (!forceNew) {
      const mostRecentAttempt = await ctx.db
        .query("lessonAttempts")
        .withIndex("by_user_lesson", (q) =>
          q.eq("userId", identity.subject).eq("lessonId", lessonId),
        )
        .order("desc")
        .first();

      if (mostRecentAttempt) {
        return mostRecentAttempt;
      }
    }

    const lesson = await ctx.db.get(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const attemptId = await ctx.db.insert("lessonAttempts", {
      userId: identity.subject,
      lessonId,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalQuestions: lesson.questions?.length || 0,
      answers: [],
    });

    return await ctx.db.get(attemptId);
  },
});

export const saveAnswer = mutation({
  args: {
    attemptId: v.id("lessonAttempts"),
    questionIndex: v.number(),
    isCorrect: v.boolean(),
    timeSpentMs: v.optional(v.number()),
    selectedOption: v.optional(v.union(v.number(), v.null())),
    placedSections: v.optional(
      v.array(v.object({ name: v.string(), answers: v.array(v.string()) })),
    ),
    // This is the fix:
    textAnswer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== identity.subject) {
      throw new Error("Attempt not found or not owned by user");
    }

    if (attempt.completedAt) {
      return { success: false, reason: "Attempt already completed" };
    }

    const existingAnswerIndex = attempt.answers.findIndex(
      (a) => a.questionIndex === args.questionIndex,
    );

    const newAnswer = {
      questionIndex: args.questionIndex,
      isCorrect: args.isCorrect,
      timeSpentMs: args.timeSpentMs,
      selectedOption: args.selectedOption,
      placedSections: args.placedSections,
      textAnswer: args.textAnswer,
      answeredAt: new Date().toISOString(),
    };

    const newAnswers = [...attempt.answers];
    if (existingAnswerIndex !== -1) {
      newAnswers[existingAnswerIndex] = newAnswer;
    } else {
      newAnswers.push(newAnswer);
    }

    await ctx.db.patch(args.attemptId, {
      answers: newAnswers,
      answeredCount: newAnswers.length,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const finalizeAttempt = mutation({
  args: { attemptId: v.id("lessonAttempts"), score: v.number() },
  handler: async (ctx, { attemptId, score }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempt = await ctx.db.get(attemptId);
    if (!attempt || attempt.userId !== identity.subject) {
      throw new Error("Attempt not found or not owned by user");
    }

    await ctx.db.patch(attemptId, {
      score,
      completedAt: new Date().toISOString(),
    });
  },
});
