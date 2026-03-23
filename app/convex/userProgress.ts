import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Returns the current authenticated user's progress record (XP, streak, completed lessons).
 * Throws if the caller is not authenticated.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return progress;
  },
});

/**
 * Upserts the current user's progress record with the provided XP, streak, and completed lesson IDs.
 * Creates a new record if one does not exist. Throws if the caller is not authenticated.
 *
 * @param xp - Total XP to set
 * @param streak - Current streak count to set
 * @param completedLessonIds - Full array of completed lesson IDs
 */
export const update = mutation({
  args: {
    xp: v.number(),
    streak: v.number(),
    // FIX 1: Use v.id("lessons") to match the Schema (IDs, not numbers)
    completedLessonIds: v.array(v.id("lessons")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const data = {
      userId: identity.subject,
      xp: args.xp,
      streak: args.streak,
      // FIX 2: Ensure this key matches your Schema exactly ("completedLessonIds")
      completedLessonIds: args.completedLessonIds,
      lastUpdated: new Date().toISOString(),
    };

    if (existing) {
      // FIX 3: Patch expects valid fields matching the schema
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("userProgress", data);
    }
  },
});

/**
 * Resets the current authenticated user's XP, streak, and completed lessons to zero/empty.
 * No-op if the user has no existing progress record.
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        xp: 0,
        streak: 0,
        // FIX 4: Use the correct field name and an empty array
        completedLessonIds: [],
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

/**
 * Creates a new user progress record or updates the display name on an existing one.
 * Called on first login and whenever the user's name may have changed.
 *
 * @param userId - Clerk subject ID (`identity.subject`)
 * @param userName - Optional display name to store
 * @returns The existing or newly created progress record
 */
export const initializeUser = mutation({
  args: {
    userId: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userProgress) {
      // IF USER EXISTS: Update their name if it's missing or changed
      if (args.userName && userProgress.userName !== args.userName) {
        await ctx.db.patch(userProgress._id, { userName: args.userName });
      }
      return userProgress;
    }

    // IF USER IS NEW: Create them with the name
    return await ctx.db.insert("userProgress", {
      userId: args.userId,
      userName: args.userName || "Anonymous Student",
      xp: 0,
      streak: 1,
      lastLoginDate: new Date().toISOString(),
      completedLessonIds: [],
      lastUpdated: new Date().toISOString(),
    });
  },
});

/**
 * Returns the top 10 students by XP alongside the current user's rank and XP.
 * Used by `StudentLeaderboard` to always surface the current user's position even
 * when they fall outside the top 10.
 *
 * @returns `{ topStudents, currentUser }` where:
 *   - `topStudents` — up to 10 entries with `{ id, name, xp, isCurrentUser }`
 *   - `currentUser` — `{ rank, name, xp, inTopTen }` for the authenticated caller,
 *     or `null` if the caller is unauthenticated. Rank is computed as the count of
 *     users with strictly greater XP plus one. If the user has no progress record,
 *     `xp` is 0 and `rank` is `totalStudents + 1`.
 */
export const getTopStudentsWithCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const allProgress = await ctx.db.query("userProgress").collect();
    const sorted = allProgress.slice().sort((a, b) => b.xp - a.xp);

    const identity = await ctx.auth.getUserIdentity();

    const topStudents = sorted.slice(0, 10).map((student) => ({
      id: student._id,
      name: student.userName || "Anonymous",
      xp: student.xp,
      isCurrentUser: identity ? student.userId === identity.subject : false,
    }));

    let currentUser: { rank: number; name: string; xp: number; inTopTen: boolean } | null = null;

    if (identity) {
      const record = allProgress.find((r) => r.userId === identity.subject);
      if (!record) {
        currentUser = {
          rank: allProgress.length + 1,
          name: identity.name ?? "You",
          xp: 0,
          inTopTen: false,
        };
      } else {
        const rank = allProgress.filter((r) => r.xp > record.xp).length + 1;
        currentUser = {
          rank,
          name: record.userName || identity.name || "You",
          xp: record.xp,
          inTopTen: rank <= 10,
        };
      }
    }

    return { topStudents, currentUser };
  },
});

/**
 * Returns the top 10 students by XP as a simple public list.
 * @deprecated Prefer `getTopStudentsWithCurrentUser` which also returns the caller's rank.
 * @returns Array of `{ id, name, xp }` sorted by XP descending
 */
export const getTopStudents = query({
  args: {},
  handler: async (ctx) => {
    const allProgress = await ctx.db.query("userProgress").collect();

    // 1. Sort by XP (Highest first)
    // 2. Take top 10
    // 3. Return only safe public data
    return allProgress
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((student) => ({
        id: student._id,
        name: student.userName || "Anonymous",
        xp: student.xp,
      }));
  },
});
