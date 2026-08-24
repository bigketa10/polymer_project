"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Presentation } from "lucide-react";

export function SlideDecks() {
  const decks = useQuery(api.slides.list);
  if (!decks?.length) return <p className="text-sm text-slate-500">No imported decks yet.</p>;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => (
    <Link key={deck._id} href={`/teacher/slides/${deck._id}`} className="rounded-lg border bg-white p-4 transition hover:border-blue-400 hover:shadow-sm">
      <Presentation className="mb-3 h-5 w-5 text-blue-600" aria-hidden="true" />
      <h2 className="font-semibold text-slate-900">{deck.title}</h2>
      <p className="mt-1 text-xs text-slate-500">{deck.slides.length} slides · {deck.originalFileName}</p>
    </Link>
  ))}</div>;
}