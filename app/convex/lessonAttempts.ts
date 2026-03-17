import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminIdentity, requireAdmin, requireAuthenticated } from "./auth";

export const startAttempt = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticated(ctx);

    const now = new Date().toISOString();
    const id = await ctx.db.insert("lessonAttempts", {
      userId: identity.subject,
      lessonId: args.lessonId,
      startedAt: now,
      updatedAt: now,
      answers: [],
    });

    return { id };
  },
});

export const saveAnswer = mutation({
  args: {
    attemptId: v.id("lessonAttempts"),
    questionIndex: v.number(),
    selectedOption: v.union(v.number(), v.null()),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticated(ctx);

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== identity.subject) throw new Error("Not authorized");

    const existing = attempt.answers || [];
    const nextAnswers = existing.filter(
      (a) => a.questionIndex !== args.questionIndex,
    );
    nextAnswers.push({
      questionIndex: args.questionIndex,
      selectedOption: args.selectedOption,
      isCorrect: args.isCorrect,
    });

    const now = new Date().toISOString();
    await ctx.db.patch(args.attemptId, {
      answers: nextAnswers,
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
    const identity = await requireAuthenticated(ctx);

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== identity.subject) throw new Error("Not authorized");

    const now = new Date().toISOString();
    await ctx.db.patch(args.attemptId, {
      score: args.score,
      completedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticated(ctx);

    const canView = identity.subject === args.userId || isAdminIdentity(identity);
    if (!canView) throw new Error("Not authorized");

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
    await requireAdmin(ctx);

    const attempts = await ctx.db
      .query("lessonAttempts")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();

    return attempts;
  },
});
