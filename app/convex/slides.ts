import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const slideValidator = v.object({
  number: v.number(),
  title: v.string(),
  body: v.array(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return (await ctx.db.query("slideDecks").withIndex("by_owner", (q) => q.eq("ownerId", identity.subject)).collect())
      .filter((deck) => deck.originalFileName.toLowerCase().endsWith(".pdf"))
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  },
});

export const get = query({
  args: { id: v.id("slideDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const deck = await ctx.db.get(args.id);
    if (!identity || !deck || deck.ownerId !== identity.subject) return null;
    return deck;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    moduleKey: v.optional(v.string()),
    originalFileName: v.string(),
    originalStorageId: v.id("_storage"),
    slides: v.array(slideValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!args.originalFileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Only PDF lecture decks are supported.");
    }
    return await ctx.db.insert("slideDecks", {
      ...args,
      title: args.title.trim() || args.originalFileName,
      importedAt: new Date().toISOString(),
      ownerId: identity.subject,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("slideDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.id);
    if (!deck || deck.ownerId !== identity.subject) {
      throw new Error("Deck not found");
    }

    await ctx.storage.delete(deck.originalStorageId);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const listPublic = query({
  args: { moduleKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const decks = await ctx.db.query("slideDecks").collect();
    return decks
      .filter((deck) => !args.moduleKey || deck.moduleKey === args.moduleKey)
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  },
});

export const getPublic = query({
  args: { id: v.id("slideDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.get(args.id);
  },
});