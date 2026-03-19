import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getClassStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || (identity.publicMetadata as any)?.role !== "admin") {
      // Non-admins should not see class stats.
      // Return empty/default stats to avoid leaking information.
      return {
        totalStudents: 0,
        avgXP: 0,
        strugglingStudents: 0,
        leaderboard: [],
        totalLessonsCount: 0,
      };
    }

    // 1. Get all student progress records
    const allProgress = await ctx.db.query("userProgress").collect();

    // 2. Get all lessons to map IDs to Titles
    const lessons = await ctx.db.query("lessons").collect();
    const totalLessonsCount = lessons.length;

    // 3. Calculate Global Stats
    const totalStudents = allProgress.length;
    const totalXP = allProgress.reduce((acc, curr) => acc + curr.xp, 0);
    const avgXP = totalStudents > 0 ? Math.round(totalXP / totalStudents) : 0;

    // Calculate "At Risk" students (< 100 XP)
    const strugglingStudents = allProgress.filter((p) => p.xp < 100).length;

    // 4. Sort students by XP (Leaderboard)
    const leaderboard = [...allProgress]
      .sort((a, b) => b.xp - a.xp)
      .map((student) => ({
        id: student._id, // We need this specific ID to delete them later
        userId: student.userId,
        userName: student.userName || "Anonymous User",
        xp: student.xp,
        streak: student.streak,
        completedCount: student.completedLessonIds.length,
        progressPercent:
          totalLessonsCount > 0
            ? Math.round(
                (student.completedLessonIds.length / totalLessonsCount) * 100,
              )
            : 0,
      }));

    return {
      totalStudents,
      avgXP,
      strugglingStudents,
      leaderboard,
      totalLessonsCount,
    };
  },
});

// --- NEW MUTATION: Remove a Student ---
export const removeStudent = mutation({
  args: { id: v.id("userProgress") }, // Requires the document ID
  handler: async (ctx, args) => {
    // 1. Delete userProgress record
    const progress = await ctx.db.get(args.id);
    if (!progress) return;
    const userId = progress.userId;
    await ctx.db.delete(args.id);

    // 2. Delete all lessonAttempts for this user
    const attempts = await ctx.db
      .query("lessonAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }

    // 3. Delete all messages for this user
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 4. Delete all user-created lessons for this user
    const lessons = await ctx.db
      .query("lessons")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const lesson of lessons) {
      await ctx.db.delete(lesson._id);
    }
  },
});

export const resetAllStudentProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const allProgress = await ctx.db.query("userProgress").collect();
    for (const progress of allProgress) {
      await ctx.db.delete(progress._id);
    }

    const allAttempts = await ctx.db.query("lessonAttempts").collect();
    for (const attempt of allAttempts) {
      await ctx.db.delete(attempt._id);
    }

    return {
      success: true,
      removedProgressCount: allProgress.length,
      removedAttemptsCount: allAttempts.length,
    };
  },
});
