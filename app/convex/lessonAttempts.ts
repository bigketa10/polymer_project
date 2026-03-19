import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const startAttempt = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const lesson = await ctx.db.get(args.lessonId);
    const totalQuestions = lesson?.questions?.length || 0;

    const now = new Date().toISOString();
    const id = await ctx.db.insert("lessonAttempts", {
      userId: identity.subject,
      lessonId: args.lessonId,
      totalQuestions,
      answeredCount: 0,
      completionPercent: 0,
      totalTimeMs: 0,
      startedAt: now,
      updatedAt: now,
      answers: [],
    });

    return { id };
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
    textAnswer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== identity.subject) throw new Error("Not authorized");

    if (attempt.completedAt) {
      return { success: false, reason: "Attempt already completed" };
    }

    const existingAnswerIndex = (attempt.answers || []).findIndex(
      (a: any) => a.questionIndex === args.questionIndex,
    );

    const newAnswer: any = {
      questionIndex: args.questionIndex,
      isCorrect: args.isCorrect,
      answeredAt: new Date().toISOString(),
      timeSpentMs:
        typeof args.timeSpentMs === "number"
          ? Math.max(0, Math.round(args.timeSpentMs))
          : undefined,
    };
    if (args.selectedOption !== undefined)
      newAnswer.selectedOption = args.selectedOption;
    if (args.placedSections !== undefined)
      newAnswer.placedSections = args.placedSections;
    if (args.textAnswer !== undefined) newAnswer.textAnswer = args.textAnswer;

    const nextAnswers = [...(attempt.answers || [])];
    if (existingAnswerIndex !== -1) {
      nextAnswers[existingAnswerIndex] = newAnswer;
    } else {
      nextAnswers.push(newAnswer);
    }

    const totalTimeMs = nextAnswers.reduce(
      (acc: number, answer: any) => acc + (answer.timeSpentMs || 0),
      0,
    );
    const answeredCount = nextAnswers.length;

    let totalQuestions =
      typeof attempt.totalQuestions === "number" ? attempt.totalQuestions : 0;
    if (totalQuestions <= 0) {
      const lesson = await ctx.db.get(attempt.lessonId);
      totalQuestions = lesson?.questions?.length || 0;
    }
    const completionPercent =
      totalQuestions > 0
        ? Math.round((answeredCount / totalQuestions) * 100)
        : 0;

    const now = new Date().toISOString();
    await ctx.db.patch(args.attemptId, {
      answers: nextAnswers,
      totalQuestions,
      answeredCount,
      completionPercent,
      totalTimeMs,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const finalizeAttempt = mutation({
  args: {
    attemptId: v.id("lessonAttempts"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== identity.subject) throw new Error("Not authorized");

    const now = new Date().toISOString();
    const answers = attempt.answers || [];
    const totalTimeMs = answers.reduce(
      (acc: number, answer: any) => acc + (answer.timeSpentMs || 0),
      0,
    );
    const answeredCount = answers.length;
    let totalQuestions =
      typeof attempt.totalQuestions === "number" ? attempt.totalQuestions : 0;
    if (totalQuestions <= 0) {
      const lesson = await ctx.db.get(attempt.lessonId);
      totalQuestions = lesson?.questions?.length || 0;
    }
    const completionPercent =
      totalQuestions > 0
        ? Math.round((answeredCount / totalQuestions) * 100)
        : 0;

    await ctx.db.patch(args.attemptId, {
      score: args.score,
      totalQuestions,
      answeredCount,
      completionPercent,
      totalTimeMs,
      completedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // In a real app, you'd want to check if the user is an admin/teacher
    // to allow them to view other users' progress.
    const role = (identity.publicMetadata as any)?.role;
    if (role !== "admin" && identity.subject !== args.userId) {
      return [];
    }
    return await ctx.db
      .query("lessonAttempts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
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
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .order("desc")
      .collect();
  },
});
