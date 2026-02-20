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
    const stored = await ctx.db.query("modules").collect();

    return stored.sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
  },
});

export const ensureDefaultModules = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stored = await ctx.db.query("modules").collect();
    const existingByKey = new Map(stored.map((m) => [m.moduleKey, m]));

    for (const moduleDef of DEFAULT_MODULES) {
      if (existingByKey.has(moduleDef.moduleKey)) continue;

      await ctx.db.insert("modules", {
        moduleKey: moduleDef.moduleKey,
        code: moduleDef.code,
        title: moduleDef.title,
        description: moduleDef.description,
        color: moduleDef.color,
        iconKey: moduleDef.iconKey,
        order: moduleDef.order,
        isDefault: true,
      });
    }

    return { success: true };
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

export const updateModule = mutation({
  args: {
    id: v.id("modules"),
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

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Module not found");

    const desiredKey =
      (args.moduleKey && slugifyModuleKey(args.moduleKey)) ||
      slugifyModuleKey(args.code);
    if (!desiredKey) throw new Error("Invalid module key");

    const allModules = await ctx.db.query("modules").collect();
    if (
      allModules.some(
        (m) => m._id !== args.id && m.moduleKey === desiredKey,
      )
    ) {
      throw new Error("A module with that key already exists");
    }

    if (desiredKey !== existing.moduleKey) {
      const linkedLessons = await ctx.db.query("lessons").collect();
      for (const lesson of linkedLessons) {
        if ((lesson.section || "") === existing.moduleKey) {
          await ctx.db.patch(lesson._id, { section: desiredKey });
        }
      }
    }

    await ctx.db.patch(args.id, {
      moduleKey: desiredKey,
      code: args.code.trim(),
      title: args.title.trim(),
      description: args.description.trim(),
      color: args.color.trim(),
      iconKey: (args.iconKey || "atom").trim(),
      order: args.order ?? existing.order,
    });

    return { success: true, moduleKey: desiredKey };
  },
});

export const deleteModule = mutation({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const moduleDoc = await ctx.db.get(args.id);
    if (!moduleDoc) return;

    const linkedLessons = await ctx.db.query("lessons").collect();
    const count = linkedLessons.filter(
      (lesson) => (lesson.section || "") === moduleDoc.moduleKey,
    ).length;

    if (count > 0) {
      throw new Error(
        "Cannot delete this module while lessons are still assigned to it.",
      );
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const reorderModules = mutation({
  args: { moduleIds: v.array(v.id("modules")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (let index = 0; index < args.moduleIds.length; index += 1) {
      const moduleId = args.moduleIds[index];
      await ctx.db.patch(moduleId, { order: index + 1 });
    }

    return { success: true };
  },
});
