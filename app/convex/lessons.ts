import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all lessons (both default and user custom ones)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // We support 3 categories:
    // - default (seeded): isDefault = true
    // - public (teacher-created): isDefault = false, userId is not set
    // - personal (user-created): isDefault = false, userId = current user
    const all = await ctx.db.query("lessons").collect();
    const defaults = all.filter((l) => l.isDefault === true);
    const publicLessons = all.filter((l) => l.isDefault === false && !l.userId);
    const users = identity
      ? all.filter((l) => l.userId === identity.subject)
      : [];

    const lessonsWithImages = await Promise.all(
      [...defaults, ...publicLessons, ...users].map(async (lesson) => ({
        ...lesson,
        questions: await Promise.all(
          (lesson.questions || []).map(async (q) => ({
            ...q,
            imageUrl: q.imageStorageId
              ? await ctx.storage.getUrl(q.imageStorageId)
              : q.imageUrl,
          })),
        ),
      })),
    );

    return lessonsWithImages.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});

// Create a new public lesson (visible to all users)
export const createLesson = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    difficulty: v.string(),
    xpReward: v.number(),
    section: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const all = await ctx.db.query("lessons").collect();
    const sameSection = all.filter(
      (l) => (l.section || "") === (args.section || ""),
    );
    const maxOrder = sameSection.reduce(
      (acc, l) => Math.max(acc, l.order || 0),
      0,
    );
    const order = args.order ?? maxOrder + 1;

    const id = await ctx.db.insert("lessons", {
      title: args.title,
      description: args.description,
      difficulty: args.difficulty,
      xpReward: args.xpReward,
      isDefault: false, // public, instructor-created (NOT seeded)
      order,
      section: args.section,
      questions: [],
    });

    return { id };
  },
});

export const updateLesson = mutation({
  args: {
    id: v.id("lessons"),
    title: v.string(),
    description: v.string(),
    difficulty: v.string(),
    xpReward: v.number(),
    section: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Lesson not found");

    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      difficulty: args.difficulty,
      xpReward: args.xpReward,
      section: args.section,
      order: args.order ?? existing.order,
    });

    return { success: true };
  },
});

// Allow instructors to update the full question set for a lesson.
// This powers the teacher UI for viewing, adding and editing questions.
export const updateQuestions = mutation({
  args: {
    lessonId: v.id("lessons"),
    questions: v.array(v.any()),
  },
  handler: async (ctx, { lessonId, questions }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(lessonId);
    if (!existing) {
      throw new Error("Lesson not found");
    }

    const oldStorageIds = (existing.questions || [])
      .map((q: any) => q.imageStorageId)
      .filter((id: any) => id !== undefined);

    const newStorageIds = (questions || [])
      .map((q: any) => q.imageStorageId)
      .filter((id: any) => id !== undefined);

    const idsToDelete = oldStorageIds.filter(
      (id: any) => !newStorageIds.includes(id),
    );

    for (const id of idsToDelete) {
      await ctx.storage.delete(id);
    }

    await ctx.db.patch(lessonId, {
      questions: questions,
    });

    return { success: true };
  },
});

export const deleteLesson = mutation({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const lesson = await ctx.db.get(args.id);
    if (!lesson) return;

    for (const question of lesson.questions || []) {
      if (question.imageStorageId) {
        await ctx.storage.delete(question.imageStorageId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const reorderLessons = mutation({
  args: { lessonIds: v.array(v.id("lessons")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (let index = 0; index < args.lessonIds.length; index += 1) {
      const lessonId = args.lessonIds[index];
      await ctx.db.patch(lessonId, { order: index + 1 });
    }

    return { success: true };
  },
});

export const initializeDefaults = mutation({
  args: { forceReset: v.any() }, // Keep this loose to prevent errors
  handler: async (ctx) => {
    // 1. DELETE EVERYTHING that is a default lesson
    // We do this unconditionally so there is NO chance of old data surviving
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();

    for (const lesson of existing) {
      await ctx.db.delete(lesson._id);
    }

    // 2. ADD THE NEW DATA
    const defaultLessons = [
      // ---------------------------------------------------------
      // ROTATION 1: MW, Step-Growth, Free Radical
      // ---------------------------------------------------------
      {
        title: "1. Intro, MW & Tg (Rot 1)",
        description:
          "QXU5031: Molecular weights (Mn, Mw, Mz) and thermal properties.",
        difficulty: "Beginner",
        xpReward: 100,
        isDefault: true,
        order: 1,
        section: "qxu5031",
        questions: [
          {
            question:
              "Which molecular weight average is most sensitive to the high molecular weight 'tail' of the distribution?",
            // This is the link you wanted to use
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/8/8b/GPC_Chromatogram.jpg",
            options: [
              "Mn (Number Average)",
              "Mw (Weight Average)",
              "Mz (Z-Average)",
              "Mv (Viscosity Average)",
            ],
            correct: 2,
            explanation:
              "Mz is weighted by the cube of the mass (Mi^3), making it extremely sensitive to the heaviest chains.",
          },
          {
            question:
              "Below the Glass Transition Temperature (Tg), an amorphous polymer is in what state?",
            // Glass Transition Diagram
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_transition.svg/640px-Glass_transition.svg.png",
            options: [
              "Rubbery / Viscous",
              "Hard / Glassy",
              "Liquid melt",
              "Semi-crystalline",
            ],
            correct: 1,
            explanation:
              "Below Tg, the polymer chains lack the thermal energy to move past each other, resulting in a hard, brittle 'glassy' state.",
          },
          {
            question: "The Polydispersity Index (PDI) is a measure of:",
            // Molecular Weight Distribution Curve
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Molar_mass_distribution.svg/640px-Molar_mass_distribution.svg.png",
            options: [
              "Average Chain Length",
              "Breadth of Molecular Weight Distribution",
              "Crystallinity",
              "Tacticity",
            ],
            correct: 1,
            explanation:
              "PDI (Mw/Mn) tells you how broad the distribution is. PDI = 1 means all chains are identical.",
          },
          {
            question: "Which of these is a semi-crystalline polymer?",
            // Spherulite (Crystalline structure)
            imageUrl: "",
            options: [
              "Polystyrene (Atactic)",
              "PMMA",
              "Polyethylene (HDPE)",
              "PVC (Plasticized)",
            ],
            correct: 2,
            explanation:
              "HDPE has a regular structure that allows chains to fold into crystalline lamellae.",
          },
          {
            question:
              "Colligative properties (like Osmometry) measure which average?",
            // Osmometer diagram (generic science illustration)
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Osmosis_diagram.svg/640px-Osmosis_diagram.svg.png",
            options: ["Mn", "Mw", "Mz", "Mv"],
            correct: 0,
            explanation:
              "Colligative properties depend on the NUMBER of particles, so they yield the Number Average Molecular Weight (Mn).",
          },
        ],
      },
      {
        title: "2. Step-Growth (Rot 1)",
        description: "QXU5031: Carothers equation, Condensation, Gelation.",
        difficulty: "Intermediate",
        xpReward: 120,
        isDefault: true,
        order: 2,
        section: "qxu5031",
        questions: [
          {
            question:
              "According to the Carothers Equation, high Molecular Weight is only achieved when:",
            // Carothers Equation Plot
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Carothers_Equation_Plot.svg/640px-Carothers_Equation_Plot.svg.png",
            options: [
              "Conversion (p) is very high (>99%)",
              "Conversion is low (<50%)",
              "Temperature is low",
              "Initiator concentration is high",
            ],
            correct: 0,
            explanation:
              "In step-growth, oligomers only combine to form long chains at the very end of the reaction (high conversion).",
          },
          {
            question: "Which of these is a typical Step-Growth polymer?",
            // Nylon 6,6 Structure
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Nylon_6%2C6_structure.svg/640px-Nylon_6%2C6_structure.svg.png",
            options: ["Polystyrene", "Nylon 6,6", "Polypropylene", "PVC"],
            correct: 1,
            explanation:
              "Nylon 6,6 is a polyamide formed by the condensation reaction of a diamine and a diacid.",
          },
          {
            question:
              "To form a crosslinked gel (Thermoset) in step-growth, you need:",
            // Crosslinked Network Diagram
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thermoset_vs_Thermoplastic.svg/640px-Thermoset_vs_Thermoplastic.svg.png",
            options: [
              "Functionality f = 2",
              "Functionality f > 2 (Branching)",
              "A radical initiator",
              "Low temperature",
            ],
            correct: 1,
            explanation:
              "Monomers with 3 or more reactive groups allow chains to branch and connect into a 3D network.",
          },
          {
            question:
              "Stoichiometric imbalance (excess of one monomer) results in:",
            // Molecular Weight Control (Capped Ends)
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Step-growth_polymerization_molecular_weight_control.svg/640px-Step-growth_polymerization_molecular_weight_control.svg.png",
            options: ["Higher MW", "Lower MW", "Faster reaction", "Explosion"],
            correct: 1,
            explanation:
              "Excess monomer 'caps' the chain ends with the same group (e.g., both ends become acid), preventing further reaction.",
          },
        ],
      },
      {
        title: "3. Free Radical (Rot 1)",
        description: "QXU5031: Initiation, Propagation, Termination, Kinetics.",
        difficulty: "Intermediate",
        xpReward: 120,
        isDefault: true,
        order: 3,
        section: "qxu5031",
        questions: [
          {
            question: "Identify the Propagation step:",
            // Free Radical Propagation Mechanism
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Free_Radical_Polymerization_Propagation.svg/640px-Free_Radical_Polymerization_Propagation.svg.png",
            options: [
              "I -> 2R•",
              "R• + M -> RM•",
              "RM• + M -> RMM•",
              "R• + R• -> Dead Chain",
            ],
            correct: 2,
            explanation:
              "Propagation is the rapid, repeated addition of monomer to the active radical chain end.",
          },
          {
            question:
              "The 'Trommsdorff Effect' (Auto-acceleration) is caused by:",
            // Auto-acceleration (Gel Effect) Graph
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Trommsdorff_Effect_Graph.svg/640px-Trommsdorff_Effect_Graph.svg.png",
            options: [
              "Faster initiation",
              "Suppression of Termination due to viscosity",
              "Faster propagation",
              "Exothermic explosion",
            ],
            correct: 1,
            explanation:
              "High viscosity prevents long radical chains from finding each other to terminate, but small monomers can still diffuse to propagate.",
          },
          {
            question: "Chain Transfer to Solvent results in:",
            // Chain Transfer Scheme
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Chain_Transfer_to_Solvent.svg/640px-Chain_Transfer_to_Solvent.svg.png",
            options: ["Higher MW", "Lower MW", "Crosslinking", "No change"],
            correct: 1,
            explanation:
              "The growing radical is transferred to a solvent molecule, ending the polymer chain prematurely.",
          },
          {
            question: "AIBN decomposes thermally to release:",
            // AIBN Structure
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/AIBN_Structure.svg/320px-AIBN_Structure.svg.png",
            options: ["Oxygen", "Nitrogen gas (N2)", "Chlorine", "Hydrogen"],
            correct: 1,
            explanation:
              "AIBN decomposition is driven by the formation of the very stable N2 molecule.",
          },
        ],
      },
      // ---------------------------------------------------------
      // ROTATION 2: Heterogeneous, Ionic, Ring Opening
      // ---------------------------------------------------------
      {
        title: "4. Heterogeneous (Rot 2)",
        description: "QXU5031: Emulsion, Suspension, Copolymerization.",
        difficulty: "Advanced",
        xpReward: 150,
        isDefault: true,
        order: 4,
        section: "qxu5031",
        questions: [
          {
            question: "In Emulsion Polymerization, the main reaction site is:",
            // Micelle Diagram (Emulsion Polymerization)
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Emulsion_Polymerization_Mechanism.svg/640px-Emulsion_Polymerization_Mechanism.svg.png",
            options: [
              "Monomer Droplets",
              "Water Phase",
              "Surfactant Micelles",
              "Reactor Walls",
            ],
            correct: 2,
            explanation:
              "Initiators enter monomer-swollen micelles to start polymerization, creating latex particles.",
          },
          {
            question: "If reactivity ratios r1=0 and r2=0, the copolymer is:",
            // Alternating Copolymer Structure
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Alternating_Copolymer.svg/640px-Alternating_Copolymer.svg.png",
            options: ["Random", "Block", "Alternating", "Gradient"],
            correct: 2,
            explanation:
              "Neither monomer reacts with itself, so they are forced to alternate (A-B-A-B).",
          },
          {
            question: "Suspension polymerization typically produces:",
            // Suspension Polymerization Beads
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Suspension_Polymerization_Beads.jpg/640px-Suspension_Polymerization_Beads.jpg",
            options: [
              "Nanoparticles",
              "Micron-sized Beads",
              "A solid block",
              "A solution",
            ],
            correct: 1,
            explanation:
              "Suspension uses mechanical agitation and stabilizers to create polymer beads (like PVC powder).",
          },
          {
            question:
              "A major advantage of Emulsion over Bulk polymerization is:",
            options: [
              "High Purity",
              "Heat Dissipation (Safety)",
              "No water needed",
              "Transparency",
            ],
            correct: 1,
            explanation:
              "The water phase acts as a massive heat sink, preventing thermal runaway.",
          },
        ],
      },
      {
        title: "5. Ionic & ROP (Rot 2)",
        description: "QXU5031: Cationic, Anionic, Living, ROP.",
        difficulty: "Expert",
        xpReward: 150,
        isDefault: true,
        order: 5,
        section: "qxu5031",
        questions: [
          {
            question:
              "Living Anionic Polymerization requires the strict absence of:",
            // Anionic Polymerization Mechanism
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Anionic_Polymerization_Initiation.svg/640px-Anionic_Polymerization_Initiation.svg.png",
            options: [
              "Monomer",
              "Water/Oxygen (Impurities)",
              "Low Temp",
              "Inert Gas",
            ],
            correct: 1,
            explanation:
              "The carbanion active center is a strong base and dies instantly if it touches a proton source (water) or oxygen.",
          },
          {
            question: "Ring Opening Polymerization (ROP) is driven by:",
            // Ring Opening Polymerization General Scheme
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Ring_Opening_Polymerization_General.svg/640px-Ring_Opening_Polymerization_General.svg.png",
            options: ["Relief of Ring Strain", "Entropy", "Pressure", "Light"],
            correct: 0,
            explanation:
              "Opening the cyclic monomer releases internal bond angle strain (Enthalpy driven).",
          },
          {
            question: "Cationic Polymerization is used to make:",
            // Polyisobutylene Structure
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Polyisobutylene.svg/320px-Polyisobutylene.svg.png",
            options: [
              "Polyethylene",
              "Polyisobutylene (Butyl Rubber)",
              "PVC",
              "Nylon",
            ],
            correct: 1,
            explanation:
              "Isobutylene has electron-donating groups that stabilize the carbocation intermediate.",
          },
          {
            question: "How are Block Copolymers made in Living Polymerization?",
            // Block Copolymer Diagram
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/9/97/Block_copolymer_3D.svg",
            options: [
              "Mixing polymers",
              "Sequential Monomer Addition",
              "Adding terminator",
              "Using UV",
            ],
            correct: 1,
            explanation:
              "Polymerize A until done, then add B. The 'living' ends of A initiate B.",
          },
        ],
      },
      // ---------------------------------------------------------
      // ROTATION 3: Advanced Polymer Chemistry (QXU6033)
      // ---------------------------------------------------------
      {
        title: "6. Controlled Radical Polym. (CRP)",
        description: "QXU6033: NMP, ATRP, RAFT and Living Kinetics.",
        difficulty: "Expert",
        xpReward: 200,
        isDefault: true,
        order: 6,
        section: "qxu6033",
        questions: [
          {
            question:
              "In an ideal Controlled Radical Polymerization (CRP), the kinetics are:",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Living_polymerization_molecular_weight_distribution.svg/640px-Living_polymerization_molecular_weight_distribution.svg.png",
            options: [
              "Zero order w.r.t Monomer",
              "First order w.r.t Monomer (ln[M0]/[M] is linear)",
              "Second order w.r.t Monomer",
              "Independent of Initiator",
            ],
            correct: 1,
            explanation:
              "Ideal CRP shows first-order kinetics with respect to monomer concentration, indicating a constant concentration of active radicals.",
          },
          {
            question: "In ATRP, what is the role of the Cu(II) species?",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/ATRP_Mechanism.svg/640px-ATRP_Mechanism.svg.png",
            options: [
              "It acts as the Activator",
              "It acts as the Deactivator (Persistent Radical)",
              "It initiates the reaction",
              "It acts as the solvent",
            ],
            correct: 1,
            explanation:
              "Cu(I) activates the dormant species, while Cu(II) deactivates the growing radical, returning it to the dormant state to lower PDI.",
          },
          {
            question:
              "In a RAFT agent (Z-C(=S)S-R), what is the function of the 'Z' group?",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/RAFT_Mechanism.svg/640px-RAFT_Mechanism.svg.png",
            options: [
              "It leaves to initiate new chains",
              "It controls the reactivity of the C=S bond",
              "It acts as the monomer",
              "It is the propagating species",
            ],
            correct: 1,
            explanation:
              "The Z-group modifies the reactivity of the C=S double bond, influencing the rate of radical addition and fragmentation.",
          },
          {
            question:
              "Which CRP method uses a stable nitroxide radical (like TEMPO) to cap the growing chain?",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/TEMPO_structure.svg/320px-TEMPO_structure.svg.png",
            options: ["ATRP", "RAFT", "NMP (Nitroxide Mediated)", "SARA"],
            correct: 2,
            explanation:
              "NMP uses stable radicals like TEMPO to reversibly couple with the active chain end, reducing termination events.",
          },
        ],
      },
      {
        title: "7. Dendrimers & Hyperbranched",
        description: "QXU6033: Divergent vs Convergent, PAMAM, and SCVP.",
        difficulty: "Expert",
        xpReward: 200,
        isDefault: true,
        order: 7,
        section: "qxu6033",
        questions: [
          {
            question:
              "Which synthesis method builds a dendrimer from the 'Core' outwards?",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Dendrimer_divergent_synthesis.svg/640px-Dendrimer_divergent_synthesis.svg.png",
            options: [
              "Convergent (Fréchet)",
              "Divergent (Tomalia)",
              "Click Chemistry",
              "Self-Condensing",
            ],
            correct: 1,
            explanation:
              "Divergent synthesis (pioneered by Tomalia for PAMAM) builds the molecule from the core to the periphery.",
          },
          {
            question:
              "Unlike perfect Dendrimers, Hyperbranched polymers prepared by one-pot synthesis:",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Hyperbranched_Polymer_Structure.svg/640px-Hyperbranched_Polymer_Structure.svg.png",
            options: [
              "Have a Degree of Branching (DB) = 1.0",
              "Are perfectly monodisperse",
              "Contain linear defects and are polydisperse",
              "Cannot be crosslinked",
            ],
            correct: 2,
            explanation:
              "Hyperbranched polymers are synthesized in one step (e.g., SCVP) and contain structural imperfections (linear units), unlike monodisperse dendrimers.",
          },
          {
            question:
              "According to the Carothers equation for branching, the Gel Point occurs when:",
            options: ["p = 1.0", "p = 2 / f_avg", "p = 0.5", "f_avg = 1"],
            correct: 1,
            explanation:
              "For non-linear step growth, gelation (infinite network formation) occurs theoretically when conversion p = 2/fav.",
          },
        ],
      },
      {
        title: "8. Complex Architectures",
        description: "QXU6033: Star Polymers and Self-Assembly.",
        difficulty: "Expert",
        xpReward: 250,
        isDefault: true,
        order: 8,
        section: "qxu6033",
        questions: [
          {
            question:
              "In the 'Arm-First' synthesis of Star Polymers, you typically react:",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Star_Polymer_Synthesis.svg/640px-Star_Polymer_Synthesis.svg.png",
            options: [
              "A multifunctional initiator with monomers",
              "Linear macro-initiators with a crosslinker",
              "Two different homopolymers",
              "Dendrimers with linear chains",
            ],
            correct: 1,
            explanation:
              "Arm-first involves creating linear polymer chains ('arms') first, then crosslinking their active ends to form the core.",
          },
          {
            question:
              "Amphiphilic block copolymers in a selective solvent will self-assemble into:",
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Micelle_scheme-en.svg/640px-Micelle_scheme-en.svg.png",
            options: [
              "Random coils",
              "Micelles or Vesicles",
              "Homopolymers",
              "Macroscopic precipitates",
            ],
            correct: 1,
            explanation:
              "To minimize free energy, the insoluble blocks aggregate (core) while the soluble blocks protect them (corona), forming micelles.",
          },
          {
            question: "The 'Critical Micelle Concentration' (CMC) is:",
            options: [
              "The temperature where micelles break",
              "The concentration above which unimers aggregate into micelles",
              "The molecular weight of the block",
              "The size of the core",
            ],
            correct: 1,
            explanation:
              "Below the CMC, copolymers exist as free chains (unimers). Above the CMC, they spontaneously assemble into micelles.",
          },
        ],
      },
    ];

    for (const lesson of defaultLessons) {
      await ctx.db.insert("lessons", lesson);
    }
    return { message: "Database completely wiped and refreshed!" };
  },
});
