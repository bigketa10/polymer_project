import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempts = await ctx.db
      .query("lessonAttempts")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", identity.subject).eq("lessonId", args.lessonId),
      )
      .collect();

    const latest = attempts.slice().sort((a, b) => {
      const aTime = a.updatedAt || a.startedAt || "";
      const bTime = b.updatedAt || b.startedAt || "";
      return bTime.localeCompare(aTime);
    })[0];

    if (latest && !latest.completedAt) {
      return {
        id: latest._id,
        resumed: true,
        answers: latest.answers || [],
      };
    }

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

    return {
      id,
      resumed: false,
      answers: [],
    };
  },
});

export const saveAnswer = mutation({
  args: {
    attemptId: v.id("lessonAttempts"),
    questionIndex: v.number(),
    isCorrect: v.boolean(),
    timeSpentMs: v.optional(v.number()),
    // 1. MAKE THIS OPTIONAL:
    selectedOption: v.optional(v.union(v.number(), v.null())),
    // 2. ADD THIS NEW FIELD:
    placedSections: v.optional(
      v.array(
        v.object({
          name: v.string(),
          answers: v.array(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== identity.subject) throw new Error("Not authorized");

    const existing = attempt.answers || [];
    const nextAnswers = existing.filter(
      (a: any) => a.questionIndex !== args.questionIndex,
    );
    // Build new answer object
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
    nextAnswers.push(newAnswer);

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
    if (!identity) throw new Error("Not authenticated");

    const attempts = await ctx.db
      .query("lessonAttempts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return attempts;
  },
});

export const getByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const attempts = await ctx.db
      .query("lessonAttempts")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();

    return attempts;
  },
});
