import React from "react";
import { glossary } from "../convex/glossary"; // Adjust path as needed

export const ExplainerText = ({ text }: { text: string }) => {
  const words = text.split(" ");

  return (
    <p className="leading-7">
      {words.map((word, index) => {
        // Remove punctuation so "polymer." matches "polymer"
        const cleanKey = word
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 z-50">
                  <div className="bg-white border-2 border-slate-200 p-3 rounded-xl shadow-xl text-sm">
                    <p className="text-slate-800 leading-tight">
                      {entry.definition}
                    </p>
                    {/* Decorative triangle arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-slate-200 rotate-45 -mt-1.5" />
                  </div>
                </div>
              </span>
            ) : (
              <span>{word}</span>
            )}{" "}
          </React.Fragment>
        );
      })}
    </p>
  );
};
