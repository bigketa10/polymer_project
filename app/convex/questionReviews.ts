import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const addDays = (isoDate: string, days: number) => {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const computeNextSchedule = ({
  quality,
  prevEaseFactor,
  prevIntervalDays,
  prevRepetitions,
}: {
  quality: number;
  prevEaseFactor: number;
  prevIntervalDays: number;
  prevRepetitions: number;
}) => {
  const q = clamp(Math.round(quality), 1, 5);
  const newEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    prevEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    return {
      easeFactor: newEaseFactor,
      repetitions: 0,
      intervalDays: 1,
    };
  }

  const repetitions = prevRepetitions + 1;
  let intervalDays = 1;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.max(1, Math.round(prevIntervalDays * newEaseFactor));

  return { easeFactor: newEaseFactor, repetitions, intervalDays };
};

export const recordReview = mutation({
  args: {
    lessonId: v.id("lessons"),
    questionIndex: v.number(),
    confidence: v.number(),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = new Date().toISOString();
    const baseQuality = clamp(args.confidence, 1, 5);
    const quality = args.isCorrect ? baseQuality : Math.min(baseQuality, 2);

    const existing = await ctx.db
      .query("questionReviews")
      .withIndex("by_user_lesson_question", (q) =>
        q
          .eq("userId", identity.subject)
          .eq("lessonId", args.lessonId)
          .eq("questionIndex", args.questionIndex),
      )
      .first();

    const prevEaseFactor = existing?.easeFactor ?? DEFAULT_EASE_FACTOR;
    const prevIntervalDays = existing?.intervalDays ?? 1;
    const prevRepetitions = existing?.repetitions ?? 0;

    const nextSchedule = computeNextSchedule({
      quality,
      prevEaseFactor,
      prevIntervalDays,
      prevRepetitions,
    });

    const nextDueAt = addDays(now, nextSchedule.intervalDays);

    if (existing) {
      await ctx.db.patch(existing._id, {
        easeFactor: nextSchedule.easeFactor,
        intervalDays: nextSchedule.intervalDays,
        repetitions: nextSchedule.repetitions,
        lastReviewedAt: now,
        nextDueAt,
        lastConfidence: baseQuality,
        lastCorrect: args.isCorrect,
      });

      return {
        reviewId: existing._id,
        nextDueAt,
        ...nextSchedule,
      };
    }

    const reviewId = await ctx.db.insert("questionReviews", {
      userId: identity.subject,
      lessonId: args.lessonId,
      questionIndex: args.questionIndex,
      easeFactor: nextSchedule.easeFactor,
      intervalDays: nextSchedule.intervalDays,
      repetitions: nextSchedule.repetitions,
      lastReviewedAt: now,
      nextDueAt,
      lastConfidence: baseQuality,
      lastCorrect: args.isCorrect,
    });

    return { reviewId, nextDueAt, ...nextSchedule };
  },
});

export const getDueQuestions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = new Date().toISOString();
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    const due = await ctx.db
      .query("questionReviews")
      .withIndex("by_user_due", (q) =>
        q.eq("userId", identity.subject).lte("nextDueAt", now),
      )
      .take(limit);

    const hydrated = await Promise.all(
      due.map(async (review) => {
        const lesson = await ctx.db.get(review.lessonId);
        if (!lesson) return null;
        const question = lesson.questions?.[review.questionIndex];
        if (!question) return null;

        const imageUrl = question.imageStorageId
          ? await ctx.storage.getUrl(question.imageStorageId)
          : question.imageUrl;

        return {
          reviewId: review._id,
          lessonId: review.lessonId,
          lessonTitle: lesson.title,
          questionIndex: review.questionIndex,
          question: {
            ...question,
            imageUrl,
          },
          nextDueAt: review.nextDueAt,
          lastConfidence: review.lastConfidence,
          lastCorrect: review.lastCorrect,
        };
      }),
    );

    return hydrated.filter(Boolean);
  },
});
