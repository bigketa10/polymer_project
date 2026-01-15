import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all lessons (Sorted by order)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 1. Get default lessons
    const defaultLessons = await ctx.db
      .query("lessons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();

    // 2. Get user's custom lessons
    const userLessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // 3. Combine and Sort by 'order' so Lesson 1 appears before Lesson 2
    const allLessons = [...defaultLessons, ...userLessons];
    return allLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});

// Initialize default lessons
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (existing) {
      return { message: "Default lessons already exist" };
    }

    const defaultLessons = [
      {
        title: "Introduction to Polymers",
        description: "Learn the basics of polymer structure",
        difficulty: "Beginner",
        xpReward: 50,
        isDefault: true,
        order: 1, // <--- ADDED THIS
        questions: [
          {
            question: "What is a polymer?",
            options: [
              "A small molecule",
              "A large molecule made of repeating units",
              "A type of metal",
              "A chemical element",
            ],
            correct: 1,
            explanation:
              "Polymers are large molecules composed of many repeating subunits called monomers.",
            // imageUrl is optional, so we can omit it safely
          },
          {
            question: "What is a monomer?",
            options: [
              "The repeating unit in a polymer",
              "A type of polymer",
              "A chemical bond",
              "A solvent",
            ],
            correct: 0,
            explanation:
              "Monomers are the small molecular building blocks that link together to form polymers.",
          },
          {
            question: "Which of these is a natural polymer?",
            options: ["Nylon", "Polyethylene", "Cellulose", "PVC"],
            correct: 2,
            explanation:
              "Cellulose is a natural polymer found in plant cell walls, while the others are synthetic.",
          },
        ],
      },
      {
        title: "Polymerization Types",
        description: "Master addition and condensation polymerization",
        difficulty: "Intermediate",
        xpReward: 75,
        isDefault: true,
        order: 2, // <--- ADDED THIS
        questions: [
          {
            question: "In addition polymerization, monomers join by:",
            options: [
              "Losing small molecules like water",
              "Breaking double bonds without losing atoms",
              "Dissolving in solvent",
              "Heating to high temperatures",
            ],
            correct: 1,
            explanation:
              "Addition polymerization involves breaking double bonds in monomers and forming single bonds without losing any atoms.",
          },
          {
            question: "Condensation polymerization produces:",
            options: [
              "Only the polymer",
              "Polymer and small molecules like water",
              "Only water",
              "Carbon dioxide",
            ],
            correct: 1,
            explanation:
              "Condensation polymerization forms a polymer and releases small molecules (like water or HCl) as byproducts.",
          },
          {
            question: "Which polymer is made by addition polymerization?",
            options: ["Nylon", "Polyester", "Polystyrene", "Kevlar"],
            correct: 2,
            explanation:
              "Polystyrene is made by addition polymerization of styrene monomers, while nylon, polyester, and Kevlar use condensation.",
          },
        ],
      },
      {
        title: "Polymer Properties",
        description: "Understand thermoplastics vs thermosets",
        difficulty: "Intermediate",
        xpReward: 75,
        isDefault: true,
        order: 3, // <--- ADDED THIS
        questions: [
          {
            question: "Thermoplastics can be:",
            options: [
              "Melted and reshaped multiple times",
              "Only shaped once",
              "Never melted",
              "Dissolved but not melted",
            ],
            correct: 0,
            explanation:
              "Thermoplastics soften when heated and can be reshaped multiple times, making them recyclable.",
          },
          {
            question: "Thermosets are characterized by:",
            options: [
              "Linear polymer chains",
              "Cross-linked polymer networks",
              "Ability to melt easily",
              "Low molecular weight",
            ],
            correct: 1,
            explanation:
              "Thermosets have extensively cross-linked structures that prevent melting and make them permanently rigid.",
          },
          {
            question: "Which is an example of a thermoset?",
            options: ["Polyethylene", "Polypropylene", "Epoxy resin", "PVC"],
            correct: 2,
            explanation:
              "Epoxy resin is a thermoset that forms irreversible cross-links when cured.",
          },
        ],
      },
    ];

    for (const lesson of defaultLessons) {
      await ctx.db.insert("lessons", lesson);
    }

    return { message: "Default lessons initialized" };
  },
});
