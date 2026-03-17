import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user progress
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

// Update user progress
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

// Reset progress
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

// Initialize or update user
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

// NEW: Public Leaderboard Query
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
