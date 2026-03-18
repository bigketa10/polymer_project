import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Table: glossary
// Fields: term (string, unique), definition (string), category (optional string)

export const getGlossary = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("glossary").collect();
  },
});

export const addGlossaryEntry = mutation({
  args: {
    term: v.string(),
    definition: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate terms
    const existing = await ctx.db
      .query("glossary")
      .filter((q) => q.eq(q.field("term"), args.term))
      .first();
    if (existing) throw new Error("Term already exists");
    await ctx.db.insert("glossary", {
      term: args.term,
      definition: args.definition,
      category: args.category,
    });
  },
});

export const updateGlossaryEntry = mutation({
  args: {
    id: v.id("glossary"),
    definition: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      definition: args.definition,
      category: args.category,
    });
  },
});

export const deleteGlossaryEntry = mutation({
  args: { id: v.id("glossary") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
