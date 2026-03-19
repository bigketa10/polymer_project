// convex/glossary.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all glossary terms, sorted alphabetically
export const getAll = query({
  handler: async (ctx) => {
    // To sort alphabetically by term, we use the `by_term` index.
    return await ctx.db
      .query("glossary")
      .withIndex("by_term")
      .order("asc")
      .collect();
  },
});

// Create a new glossary term
export const createTerm = mutation({
  args: {
    term: v.string(),
    definition: v.string(),
  },
  handler: async (ctx, { term, definition }) => {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm || !definition.trim()) {
      throw new Error("Term and definition are required.");
    }

    const existing = await ctx.db
      .query("glossary")
      .withIndex("by_term", (q) => q.eq("term", cleanTerm))
      .first();

    if (existing) {
      throw new Error(`Term "${cleanTerm}" already exists.`);
    }

    await ctx.db.insert("glossary", {
      term: cleanTerm,
      definition: definition.trim(),
    });
  },
});

// Update an existing glossary term
export const updateTerm = mutation({
  args: {
    id: v.id("glossary"),
    term: v.string(),
    definition: v.string(),
  },
  handler: async (ctx, { id, term, definition }) => {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm || !definition.trim()) {
      throw new Error("Term and definition are required.");
    }

    const existing = await ctx.db
      .query("glossary")
      .withIndex("by_term", (q) => q.eq("term", cleanTerm))
      .first();

    // If a term with the new name exists and it's not the one we're editing
    if (existing && existing._id !== id) {
      throw new Error(`Term "${cleanTerm}" already exists.`);
    }

    await ctx.db.patch(id, {
      term: cleanTerm,
      definition: definition.trim(),
    });
  },
});

// Delete a glossary term
export const deleteTerm = mutation({
  args: { id: v.id("glossary") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
