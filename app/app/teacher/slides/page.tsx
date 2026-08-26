import type { Metadata } from "next";
import { SlidesManager } from "@/components/teacher/SlidesManager";

export const metadata: Metadata = {
  title: "Lecture Slides — PolymerLingo",
};

export default function SlidesPage() {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Lecture slides</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Upload and organize PDF lecture decks by module.
      </p>
      <SlidesManager />
    </div>
  );
}
