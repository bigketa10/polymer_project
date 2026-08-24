"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PdfGlossaryViewer } from "@/components/PdfGlossaryViewer";

export default function SlidePresentationPage() {
  const params = useParams<{ id: string }>();
  const deck = useQuery(api.slides.get, { id: params.id as Id<"slideDecks"> });
  const fileUrl = useQuery(api.uploads.getFileUrl, deck ? { storageId: deck.originalStorageId } : "skip");
  const isPdf = deck?.originalFileName.toLowerCase().endsWith(".pdf");
  const previewRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading presentation...");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (isPdf) return;
    if (!fileUrl || !previewRef.current) return;
    let cancelled = false;
    const render = async () => {
      setStatus("Rendering PowerPoint layout...");
      setRenderError(null);
      try {
        const [{ init }, response] = await Promise.all([
          import("pptx-preview"),
          fetch(fileUrl),
        ]);
        if (!response.ok) throw new Error("The stored PowerPoint file could not be downloaded.");
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled || !previewRef.current) return;
        previewRef.current.replaceChildren();
        const sizingZip = await import("jszip");
        const zip = await sizingZip.default.loadAsync(arrayBuffer);
        const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
        const sizeMatch = presentationXml?.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
        const sourceWidth = sizeMatch ? Number(sizeMatch[1]) : 16;
        const sourceHeight = sizeMatch ? Number(sizeMatch[2]) : 9;
        const width = 1280;
        const height = Math.round(width * sourceHeight / sourceWidth);
        const viewer = init(previewRef.current, { width, height, mode: "slide" });
        await viewer.preview(arrayBuffer);
        if (!previewRef.current.children.length) {
          throw new Error("The PowerPoint renderer produced no slides. Try exporting the deck as PDF.");
        }
        if (!cancelled) setStatus("");
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not render this presentation.";
          setStatus("");
          setRenderError(message);
        }
      }
    };
    void render();
    return () => { cancelled = true; };
  }, [fileUrl, isPdf]);

  if (deck === undefined) return <main className="p-8">Loading slides...</main>;
  if (!deck) return <main className="p-8"><p>Deck not found.</p><Link className="text-blue-600" href="/teacher/slides">Back to decks</Link></main>;

  return <main className="min-h-full bg-slate-950 p-4 text-slate-100 sm:p-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/teacher/slides" className="text-sm text-sky-300">Back to decks</Link>
      <header className="mb-6 mt-5"><p className="text-xs uppercase tracking-widest text-sky-300">PowerPoint presentation</p><h1 className="mt-2 text-3xl font-bold">{deck.title}</h1><p className="mt-2 text-sm text-slate-400">Glossary matches are highlighted in amber. Hover a highlight for its definition.</p></header>
      {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" download={deck.originalFileName} className="mb-4 inline-flex items-center rounded-md bg-sky-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-200">Open original {isPdf ? "PDF" : "PowerPoint"}</a>}
      {status && <p className="mb-4 rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}
      {renderError && <div className="mb-4 rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100"><p>{renderError}</p><p className="mt-2 text-red-200">The original PowerPoint is stored, but this browser renderer could not display it.</p></div>}
      {isPdf && fileUrl ? <PdfGlossaryViewer url={fileUrl} /> : <div ref={previewRef} className="min-h-[240px] overflow-x-auto rounded-lg bg-slate-900 p-2 [&_.pptx-preview-wrapper]:mx-auto [&_.pptx-preview-wrapper]:max-w-full [&_svg]:mx-auto [&_svg]:max-w-full" />}
    </div>
  </main>;
}
