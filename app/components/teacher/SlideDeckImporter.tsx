"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parsePptx } from "@/lib/pptxParser";
import { Upload, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/teacher/useToast";

export function SlideDeckImporter({ moduleKey }: { moduleKey?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const createDeck = useMutation(api.slides.create);

  const importDeck = async (file: File) => {
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".pptx")) throw new Error("Choose a .pptx PowerPoint file.");
      const slides = await parsePptx(file);
      const uploadUrl = await generateUploadUrl();
      const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.presentationml.presentation" }, body: file });
      if (!upload.ok) throw new Error("Could not upload the PowerPoint file.");
      const { storageId } = await upload.json();
      await createDeck({ title: file.name.replace(/\.pptx$/i, ""), moduleKey, originalFileName: file.name, originalStorageId: storageId, slides });
      toast("success", `Imported ${slides.length} slides from ${file.name}.`);
    } catch (error: unknown) {
      toast("error", error instanceof Error ? error.message : "Could not import the PowerPoint file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <Presentation className="h-5 w-5 text-blue-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">Native lecture slides</p>
        <p className="text-xs text-slate-500">Import a PowerPoint deck as selectable HTML slides.</p>
      </div>
      <input ref={inputRef} type="file" accept=".pptx" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importDeck(file); }} />
      <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        <Upload className="mr-1 h-4 w-4" aria-hidden="true" /> {busy ? "Importing..." : "Import deck"}
      </Button>
    </div>
  );
}