import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all lessons (both default and user custom ones)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get all lessons (both default and user custom ones)
    const defaults = await ctx.db
      .query("lessons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();
    const users = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return [...defaults, ...users].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
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
            imageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Spherulite2.jpg/640px-Spherulite2.jpg",
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
    ];

    for (const lesson of defaultLessons) {
      await ctx.db.insert("lessons", lesson);
    }
    return { message: "Database completely wiped and refreshed!" };
  },
});
