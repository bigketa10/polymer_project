"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PdfGlossaryViewer } from "@/components/PdfGlossaryViewer";

export default function StudentSlidePage() {
  const params = useParams<{ id: string }>();
  const deck = useQuery(api.slides.getPublic, {
    id: params.id as Id<"slideDecks">,
  });
  const fileUrl = useQuery(
    api.uploads.getFileUrl,
    deck ? { storageId: deck.originalStorageId } : "skip",
  );
  const glossary = useQuery(api.glossary.getAll);
  const previewRef = useRef<HTMLDivElement>(null);
  const isPdf = deck?.originalFileName.toLowerCase().endsWith(".pdf");
  const [status, setStatus] = useState("Loading presentation...");

  useEffect(() => {
    if (isPdf || !fileUrl || !previewRef.current) return;
    let cancelled = false;
    const render = async () => {
      try {
        const [{ init }, response] = await Promise.all([
          import("pptx-preview"),
          fetch(fileUrl),
        ]);
        if (!response.ok)
          throw new Error("The presentation could not be loaded.");
        const arrayBuffer = await response.arrayBuffer();
        const viewer = init(previewRef.current!, {
          width: 1280,
          height: 720,
          mode: "slide",
        });
        await viewer.preview(arrayBuffer);
        if (!cancelled) setStatus("");
      } catch (error) {
        if (!cancelled)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not render this presentation.",
          );
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, isPdf]);

  if (deck === undefined) return <main className="p-8">Loading slides...</main>;
  if (!deck)
    return (
      <main className="p-8">
        <p>Deck not found.</p>
        <Link className="text-indigo-600" href="/slides">
          Back to slides
        </Link>
      </main>
    );
  return (
    <main className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl pb-8">
        <Link href="/slides" className="text-sm text-sky-300">
          Back to slides
        </Link>
        <h1 className="mb-2 mt-5 text-3xl font-bold">{deck.title}</h1>
        <p className="mb-5 text-sm text-slate-500">
          Select text directly in the PDF, as you would in the lesson material.
        </p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            download={deck.originalFileName}
            className="mb-4 inline-flex rounded-md bg-sky-300 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Open original {isPdf ? "PDF" : "PowerPoint"}
          </a>
        )}
        {!isPdf && status && (
          <p className="mb-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {status}
          </p>
        )}
        {isPdf && fileUrl ? (
          <PdfGlossaryViewer url={fileUrl} glossary={glossary || []} />
        ) : (
          <div
            ref={previewRef}
            className="min-h-[240px] overflow-x-auto rounded-lg bg-white p-2 shadow-sm [&_.pptx-preview-wrapper]:mx-auto [&_.pptx-preview-wrapper]:max-w-full [&_svg]:mx-auto [&_svg]:max-w-full"
          />
        )}
      </div>
    </main>
  );
}
