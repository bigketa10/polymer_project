"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function SlidePresentationPage() {
  const params = useParams<{ id: string }>();
  const deck = useQuery(api.slides.get, { id: params.id as Id<"slideDecks"> });
  if (deck === undefined) return <main className="p-8">Loading slides...</main>;
  if (!deck) return <main className="p-8"><p>Deck not found.</p><Link className="text-blue-600" href="/teacher/slides">Back to decks</Link></main>;
  return <main className="min-h-full bg-slate-950 p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-5xl"><Link href="/teacher/slides" className="text-sm text-sky-300">Back to decks</Link><header className="mb-8 mt-5"><p className="text-xs uppercase tracking-widest text-sky-300">{deck.slides.length} slides</p><h1 className="mt-2 text-3xl font-bold">{deck.title}</h1></header><div className="space-y-8">{deck.slides.map((slide) => <article key={slide.number} className="min-h-[360px] rounded-xl bg-white p-8 text-slate-900 shadow-2xl sm:p-12"><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">{slide.number}</p><h2 className="mt-4 text-3xl font-bold">{slide.title}</h2><ul className="mt-8 list-disc space-y-4 pl-6 text-lg leading-relaxed">{slide.body.map((line, index) => <li key={`${slide.number}-${index}`}>{line}</li>)}</ul></article>)}</div></div></main>;
}