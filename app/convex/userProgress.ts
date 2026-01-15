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
