import type { Metadata } from "next";
import { SlideDecks } from "@/components/teacher/SlideDecks";

export const metadata: Metadata = { title: "Lecture Slides — PolymerLingo" };

export default function SlidesPage() {
  return <div className="min-h-full bg-slate-50 p-6"><h1 className="text-2xl font-bold text-slate-900">Lecture slides</h1><p className="mt-1 mb-6 text-sm text-slate-500">Choose an imported deck to present.</p><SlideDecks /></div>;
}