import { query } from "./_generated/server";
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

    // Calculate "At Risk" students (e.g., Low XP and haven't logged in recently)
    // Note: In a real app, you'd check dates. Here we'll use low XP (< 100) as a proxy.
    const strugglingStudents = allProgress.filter((p) => p.xp < 100).length;

    // 4. Sort students by XP (Leaderboard)
    const leaderboard = [...allProgress]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10) // Top 10
      .map((student) => ({
        id: student._id,
        userId: student.userId, // In a real app, you'd fetch their Name from Clerk
        xp: student.xp,
        streak: student.streak,
        completedCount: student.completedLessonIds.length,
        progressPercent: Math.round(
          (student.completedLessonIds.length / totalLessonsCount) * 100,
        ),
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
