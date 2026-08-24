"use client";

import { useEffect, useRef, useState } from "react";

type GlossaryTerm = { term: string; definition: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

export function PdfGlossaryViewer({ url, glossary }: { url: string; glossary: GlossaryTerm[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading PDF...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const renderPdf = async () => {
      setStatus("Rendering PDF...");
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (!rootRef.current) return;
        rootRef.current.replaceChildren();

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          setStatus(`Rendering page ${pageNumber} of ${pdf.numPages}...`);
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const pageRoot = document.createElement("section");
          pageRoot.className = "relative mx-auto mb-6 w-fit max-w-full overflow-hidden bg-white shadow-xl";
          pageRoot.style.width = `${viewport.width}px`;
          pageRoot.style.height = `${viewport.height}px`;

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block max-w-full";
          pageRoot.append(canvas);
          rootRef.current.append(pageRoot);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;

          const textContent = await page.getTextContent();
          const textLayer = document.createElement("div");
          textLayer.className = "absolute inset-0 select-text";
          for (const item of textContent.items) {
            if (!("str" in item) || !item.str.trim()) continue;
            const transform = pdfjs.Util.transform(viewport.transform, item.transform);
            const run = document.createElement("span");
            run.className = "absolute whitespace-pre leading-none text-transparent";
            run.style.left = `${transform[4]}px`;
            run.style.top = `${transform[5] - Math.hypot(transform[2], transform[3])}px`;
            run.style.fontSize = `${Math.max(6, Math.hypot(transform[2], transform[3]))}px`;
            run.style.width = `${Math.max(1, item.width * 1.35)}px`;
            run.style.height = `${Math.max(8, Math.hypot(transform[2], transform[3]) * 1.25)}px`;
            run.textContent = item.str;
            textLayer.append(run);
          }
          pageRoot.append(textLayer);
        }
        if (!cancelled) setStatus("");
      } catch (cause) {
        if (!cancelled) {
          setStatus("");
          setError(cause instanceof Error ? cause.message : "Could not render this PDF.");
        }
      }
    };
    void renderPdf();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!rootRef.current || !glossary.length) return;
    const textNodes = rootRef.current.querySelectorAll("span.absolute");
    const usableTerms = glossary.map((item) => item.term.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!usableTerms.length) return;
    const pattern = new RegExp(`(${usableTerms.map(escapeRegExp).join("|")})`, "gi");
    textNodes.forEach((node) => {
      const text = node.textContent || "";
      pattern.lastIndex = 0;
      if (!pattern.test(text)) return;
      pattern.lastIndex = 0;
      node.classList.remove("text-transparent");
      node.classList.add("text-slate-900", "pointer-events-auto");
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
    });
  }, [glossary, status]);

  return <div><p className="mb-3 text-sm text-slate-300">{status || "Glossary matches are highlighted in amber."}</p>{error && <div className="rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}<div ref={rootRef} className="overflow-x-auto" /></div>;
}
