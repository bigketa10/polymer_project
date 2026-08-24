"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

type GlossaryTerm = { term: string; definition: string };

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderGlossaryText(text: string, glossary: GlossaryTerm[]) {
  const glossaryByTerm = new Map(
    glossary.map((item) => [item.term.toLowerCase(), item]),
  );
  return text
    .split(/(\s+)/)
    .map((part) => {
      const cleanKey = part
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()? '"[\]]/g, "");
      const entry = glossaryByTerm.get(cleanKey);
      if (!entry) return escapeHtml(part);
      return `<span class="pdf-glossary-term"><span class="pdf-glossary-word">${escapeHtml(part)}</span><span class="pdf-glossary-tooltip"><span class="pdf-glossary-tooltip-content">${escapeHtml(entry.definition)}<span class="pdf-glossary-tooltip-arrow"></span></span></span></span>`;
    })
    .join("");
}

export function PdfGlossaryViewer({
  url,
  glossary,
}: {
  url: string;
  glossary: GlossaryTerm[];
}) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageAspectRatio, setPageAspectRatio] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const file = useMemo(() => ({ url }), [url]);
  const pageWidth =
    typeof window === "undefined"
      ? 1100
      : Math.min(
          1100,
          Math.max(240, window.innerWidth - 48),
          Math.max(240, (window.innerHeight - 220) * pageAspectRatio),
        );

  return (
    <div className="pdf-glossary-page pr-1">
      {pageCount > 0 && (
        <div className="mb-4 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((value) => value - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-300">
            Page {pageNumber} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageNumber >= pageCount}
            onClick={() => setPageNumber((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">
          {error}
        </div>
      )}
      <div className="flex justify-center">
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setError(null);
          }}
          onLoadError={(cause) =>
            setError(cause.message || "Could not load this PDF.")
          }
          loading={<p className="p-4 text-sm text-slate-300">Loading PDF...</p>}
        >
          <div className="mx-auto w-fit bg-white shadow-xl">
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              customTextRenderer={({ str }) =>
                renderGlossaryText(str, glossary)
              }
              onLoadSuccess={({ originalWidth, originalHeight }) =>
                setPageAspectRatio(originalWidth / originalHeight)
              }
              onRenderError={(cause) =>
                setError(cause.message || "Could not render this PDF page.")
              }
            />
          </div>
        </Document>
      </div>
      <p className="mt-3 text-center text-sm text-slate-300">
        Glossary terms are highlighted like lesson text. Hover a term for its
        definition.
      </p>
    </div>
  );
}
