"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SlideDeckImporter } from "@/components/teacher/SlideDeckImporter";
import { SlideDecks } from "@/components/teacher/SlideDecks";

export function SlidesManager() {
  const modules = useQuery(api.modules.getAll);
  const [moduleKey, setModuleKey] = useState("");

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700" htmlFor="slide-module">
          Assign uploaded deck to module
        </label>
        <select
          id="slide-module"
          value={moduleKey}
          onChange={(event) => setModuleKey(event.target.value)}
          className="mt-2 h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">No module assigned</option>
          {modules?.map((module) => (
            <option key={module._id} value={module.moduleKey}>
              {module.code} - {module.title}
            </option>
          ))}
        </select>
      </section>
      <SlideDeckImporter moduleKey={moduleKey || undefined} />
      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Imported PDF decks</h2>
        <SlideDecks />
      </section>
    </div>
  );
}
