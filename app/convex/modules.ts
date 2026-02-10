import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_MODULES = [
  {
    moduleKey: "qxu5031",
    code: "QXU5031",
    title: "Polymer Chemistry",
    description: "Intro, MW, Step-Growth & Radical",
    color: "indigo",
    iconKey: "bookOpen",
    order: 1,
    isDefault: true,
  },
  {
    moduleKey: "qxu6033",
    code: "QXU6033",
    title: "Advanced Chemistry",
    description: "CRP, Dendrimers & Self-Assembly",
    color: "pink",
    iconKey: "beaker",
    order: 2,
    isDefault: true,
  },
] as const;

function slugifyModuleKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stored = await ctx.db.query("modules").collect();
    const merged = [
      ...DEFAULT_MODULES,
      ...stored.filter((m) => m.isDefault === false),
    ];

    // Prefer stored record over default if moduleKey collides
    const byKey = new Map<string, any>();
    for (const m of merged) {
      byKey.set(m.moduleKey, m);
    }

    return Array.from(byKey.values()).sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
  },
});

export const createModule = mutation({
  args: {
    code: v.string(),
    title: v.string(),
    description: v.string(),
    color: v.string(),
    iconKey: v.optional(v.string()),
    moduleKey: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const desiredKey =
      (args.moduleKey && slugifyModuleKey(args.moduleKey)) ||
      slugifyModuleKey(args.code);
    if (!desiredKey) throw new Error("Invalid module key");

    const reserved = new Set(DEFAULT_MODULES.map((m) => m.moduleKey as string));
    if (reserved.has(desiredKey)) {
      throw new Error("That module key is reserved");
    }

    const existing = await ctx.db.query("modules").collect();
    if (existing.some((m) => m.moduleKey === desiredKey)) {
      throw new Error("A module with that key already exists");
    }

    const maxOrder = existing.reduce(
      (acc, m) => Math.max(acc, m.order || 0),
      0,
    );
    const order = args.order ?? maxOrder + 1;

    const id = await ctx.db.insert("modules", {
      moduleKey: desiredKey,
      code: args.code.trim(),
      title: args.title.trim(),
      description: args.description.trim(),
      color: args.color.trim(),
      iconKey: (args.iconKey || "atom").trim(),
      order,
      isDefault: false,
    });

    return { id, moduleKey: desiredKey };
  },
});
