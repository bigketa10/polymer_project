export type GlossaryEntry = {
  definition: string;
  category?: string;
};

export const glossary: Record<string, GlossaryEntry> = {
  polymer: {
    definition:
      "A large molecule composed of many repeated subunits (monomers).",
    category: "Basics",
  },
  monomer: {
    definition:
      "A small molecule that can react with others to form a long polymer chain.",
    category: "Basics",
  },
  tg: {
    definition:
      "Glass Transition Temperature: the point where a polymer turns from hard/glassy to soft/rubbery.",
    category: "Thermal Properties",
  },
  atrp: {
    definition:
      "Atom Transfer Radical Polymerization: a method for controlled polymer growth.",
    category: "Synthesis",
  },
  // Add as many as you like!
};
