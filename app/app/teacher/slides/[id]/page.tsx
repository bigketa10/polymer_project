"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type GlossaryTerm = { term: string; definition: string };

function highlightGlossary(root: HTMLElement, terms: GlossaryTerm[]) {
  const sortedTerms = terms.map((item) => item.term.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!sortedTerms.length) return;
  const pattern = new RegExp(`(${sortedTerms.map((term) => term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join("|")})`, "gi");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest("mark, script, style")) continue;
    nodes.push(node as Text);
  }
  for (const textNode of nodes) {
    if (!pattern.test(textNode.data)) {
      pattern.lastIndex = 0;
      continue;
    }
    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    textNode.data.replace(pattern, (match, _group, offset: number) => {
      fragment.append(textNode.data.slice(lastIndex, offset));
      const mark = document.createElement("mark");
      mark.className = "bg-amber-300 text-slate-950 rounded px-0.5";
      mark.title = terms.find((item) => item.term.toLowerCase() === match.toLowerCase())?.definition || "Glossary term";
      mark.textContent = match;
      fragment.append(mark);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.append(textNode.data.slice(lastIndex));
    textNode.replaceWith(fragment);
  }
}

export default function SlidePresentationPage() {
  const params = useParams<{ id: string }>();
  const deck = useQuery(api.slides.get, { id: params.id as Id<"slideDecks"> });
  const fileUrl = useQuery(api.uploads.getFileUrl, deck ? { storageId: deck.originalStorageId } : "skip");
  const glossary = useQuery(api.glossary.getAll) as GlossaryTerm[] | undefined;
  const previewRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading presentation...");

  useEffect(() => {
    if (!fileUrl || !previewRef.current) return;
    let cancelled = false;
    const render = async () => {
      setStatus("Rendering PowerPoint layout...");
      try {
        const [{ init }, response] = await Promise.all([
          import("pptx-preview"),
          fetch(fileUrl),
        ]);
        if (!response.ok) throw new Error("The stored PowerPoint file could not be downloaded.");
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled || !previewRef.current) return;
        previewRef.current.replaceChildren();
        const viewer = init(previewRef.current, {
          width: 1280,
          height: 720,
          mode: "slide",
        });
        await viewer.preview(arrayBuffer);
        if (!cancelled) setStatus("");
        if (glossary?.length) highlightGlossary(previewRef.current, glossary);
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not render this presentation.");
      }
    };
    void render();
    return () => { cancelled = true; };
  }, [fileUrl, glossary]);

  if (deck === undefined) return <main className="p-8">Loading slides...</main>;
  if (!deck) return <main className="p-8"><p>Deck not found.</p><Link className="text-blue-600" href="/teacher/slides">Back to decks</Link></main>;

  return <main className="min-h-full bg-slate-950 p-4 text-slate-100 sm:p-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/teacher/slides" className="text-sm text-sky-300">Back to decks</Link>
      <header className="mb-6 mt-5"><p className="text-xs uppercase tracking-widest text-sky-300">PowerPoint presentation</p><h1 className="mt-2 text-3xl font-bold">{deck.title}</h1><p className="mt-2 text-sm text-slate-400">Glossary matches are highlighted in amber. Hover a highlight for its definition.</p></header>
      {status && <p className="mb-4 rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}
      <div ref={previewRef} className="overflow-x-auto rounded-lg bg-slate-900 p-2 [&_svg]:mx-auto [&_svg]:max-w-full" />
    </div>
  </main>;
}
