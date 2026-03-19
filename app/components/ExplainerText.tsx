import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export const ExplainerText = ({ text }: { text: string }) => {
  const glossaryData = useQuery(api.glossary.getAll);

  const glossary = useMemo(() => {
    if (!glossaryData) return {};
    const map: Record<string, { definition: string }> = {};
    for (const item of glossaryData) {
      map[item.term] = { definition: item.definition };
    }
    return map;
  }, [glossaryData]);

  const words = text.split(" ");

  return (
    <span className="leading-7">
      {words.map((word, index) => {
        // Remove punctuation so "polymer." / "polymer?" matches "polymer"
        const cleanKey = word
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"[\]]/g, "");
        const entry = glossary[cleanKey];

        return (
          <React.Fragment key={index}>
            {entry ? (
              <span className="relative group inline-block">
                {/* The Word */}
                <span className="cursor-help border-b-2 border-dotted border-indigo-400 font-medium text-indigo-900 transition-colors hover:text-indigo-600">
                  {word}
                </span>
                {/* The Tooltip (Duo Style) */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 z-50">
                  <span className="block bg-white border-2 border-slate-200 p-3 rounded-xl shadow-xl text-sm">
                    <span className="text-slate-800 leading-tight">
                      {entry.definition}
                    </span>
                    {/* Decorative triangle arrow */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-slate-200 rotate-45 -mt-1.5" />
                  </span>
                </span>
              </span>
            ) : (
              <span>{word}</span>
            )}{" "}
          </React.Fragment>
        );
      })}
    </span>
  );
};
