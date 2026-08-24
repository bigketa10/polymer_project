"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Presentation } from "lucide-react";

function StudentSlidesContent() {
  const moduleKey = useSearchParams().get("module") || undefined;
  const decks = useQuery(api.slides.listPublic, { moduleKey });
  return <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm text-indigo-600">Back to course</Link><h1 className="mt-5 text-3xl font-bold text-slate-900">Lecture slides</h1><p className="mb-6 mt-1 text-sm text-slate-500">Study the visual lecture material for this course.</p>{decks === undefined ? <p>Loading slides...</p> : decks.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-slate-500">No lecture slides are available for this course yet.</p> : <div className="grid gap-4 sm:grid-cols-2">{decks.map((deck) => <Link key={deck._id} href={`/slides/${deck._id}`} className="rounded-lg border bg-white p-5 hover:border-indigo-400 hover:shadow-sm"><Presentation className="mb-3 h-6 w-6 text-indigo-600" aria-hidden="true" /><h2 className="font-semibold text-slate-900">{deck.title}</h2><p className="mt-1 text-sm text-slate-500">{deck.originalFileName}</p></Link>)}</div>}</div></main>;
}

export default function StudentSlidesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">Loading lecture slides...</main>}><StudentSlidesContent /></Suspense>;
}