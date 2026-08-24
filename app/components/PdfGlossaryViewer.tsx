"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function PdfGlossaryViewer({ url }: { url: string }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const file = useMemo(() => ({ url }), [url]);
  const pageWidth = typeof window === "undefined" ? 1100 : Math.min(1100, Math.max(320, window.innerWidth - 48));

  return <div className="max-h-[calc(100dvh-180px)] overflow-y-auto pr-1">
    {pageCount > 0 && <div className="mb-4 flex items-center justify-center gap-3"><Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>Previous</Button><span className="text-sm text-slate-300">Page {pageNumber} of {pageCount}</span><Button type="button" variant="outline" size="sm" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((value) => value + 1)}>Next</Button></div>}
    {error && <div className="mb-4 rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>}
    <div className="overflow-x-auto">
      <Document file={file} onLoadSuccess={({ numPages }) => { setPageCount(numPages); setError(null); }} onLoadError={(cause) => setError(cause.message || "Could not load this PDF.")} loading={<p className="p-4 text-sm text-slate-300">Loading PDF...</p>}>
        <div className="mx-auto w-fit bg-white shadow-xl">
          <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer renderAnnotationLayer onRenderError={(cause) => setError(cause.message || "Could not render this PDF page.")} />
        </div>
      </Document>
    </div>
    <p className="mt-3 text-center text-sm text-slate-300">Select text directly in the PDF, as you would in the lesson material.</p>
  </div>;
}
