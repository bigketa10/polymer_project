"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

type GlossaryTerm = { term: string; definition: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function highlightGlossary(root: HTMLElement, glossary: GlossaryTerm[]) {
  const terms = glossary.map((item) => item.term.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!terms.length) return;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  root.querySelectorAll("span[data-pdf-text]").forEach((node) => {
    const text = node.textContent || "";
    pattern.lastIndex = 0;
    if (!pattern.test(text)) return;
    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(pattern, (match, _group, offset: number) => {
      fragment.append(document.createTextNode(text.slice(lastIndex, offset)));
      const mark = document.createElement("mark");
      mark.className = "rounded bg-amber-300 px-0.5 text-slate-950";
      mark.title = glossary.find((item) => item.term.toLowerCase() === match.toLowerCase())?.definition || "Glossary term";
      mark.textContent = match;
      fragment.append(mark);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.append(document.createTextNode(text.slice(lastIndex)));
    node.replaceChildren(fragment);
    node.classList.remove("text-transparent");
    node.classList.add("text-slate-900", "pointer-events-auto");
  });
}

export function PdfGlossaryViewer({ url, glossary }: { url: string; glossary: GlossaryTerm[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("Loading PDF...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setStatus("Loading PDF...");
      setError(null);
      setPageNumber(1);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setStatus("");
      } catch (cause) {
        if (!cancelled) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not load this PDF."); }
      }
    };
    void loadPdf();
    return () => {
      cancelled = true;
      const pdf = pdfRef.current;
      pdfRef.current = null;
      if (pdf) pdf.cleanup();
    };
  }, [url]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const root = rootRef.current;
    if (!pdf || !root || !pageCount) return;
    let cancelled = false;
    const renderPage = async () => {
      setStatus(`Rendering page ${pageNumber} of ${pageCount}...`);
      root.replaceChildren();
      try {
        const pdfjs = await import("pdfjs-dist");
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.05 });
        const pageRoot = document.createElement("section");
        pageRoot.className = "relative mx-auto w-fit max-w-full overflow-hidden bg-white shadow-xl";
        pageRoot.style.width = `${viewport.width}px`;
        pageRoot.style.height = `${viewport.height}px`;
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "block max-w-full";
        pageRoot.append(canvas);
        root.append(pageRoot);
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        if (cancelled) return;
        const textLayer = document.createElement("div");
        textLayer.className = "absolute inset-0 select-text";
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const transform = pdfjs.Util.transform(viewport.transform, item.transform);
          const run = document.createElement("span");
          run.dataset.pdfText = "true";
          run.className = "absolute whitespace-pre leading-none text-transparent";
          run.style.left = `${transform[4]}px`;
          run.style.top = `${transform[5] - Math.hypot(transform[2], transform[3])}px`;
          run.style.fontSize = `${Math.max(6, Math.hypot(transform[2], transform[3]))}px`;
          run.style.width = `${Math.max(1, item.width * 1.05)}px`;
          run.style.height = `${Math.max(8, Math.hypot(transform[2], transform[3]) * 1.25)}px`;
          run.textContent = item.str;
          textLayer.append(run);
        }
        pageRoot.append(textLayer);
        highlightGlossary(pageRoot, glossary);
        if (!cancelled) setStatus("");
      } catch (cause) {
        if (!cancelled) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not render this PDF page."); }
      }
    };
    void renderPage();
    return () => { cancelled = true; };
  }, [pageNumber, pageCount, glossary]);

  return <div><p className="mb-3 text-sm text-slate-300">{status || "Glossary matches are highlighted in amber."}</p>{error && <div className="mb-4 rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}{pageCount > 0 && <div className="mb-4 flex items-center justify-center gap-3"><Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>Previous</Button><span className="text-sm text-slate-300">Page {pageNumber} of {pageCount}</span><Button type="button" variant="outline" size="sm" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((value) => value + 1)}>Next</Button></div>}<div ref={rootRef} className="overflow-x-auto" /></div>;
}
