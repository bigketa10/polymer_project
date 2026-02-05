import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getClassStats = query({
  args: {},
  handler: async (ctx) => {
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
    await ctx.db.delete(args.id);
  },
});
