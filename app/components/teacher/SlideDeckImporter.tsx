"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/teacher/useToast";

export function SlideDeckImporter({ moduleKey, lessonId }: { moduleKey?: string; lessonId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const { toast } = useToast();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const createDeck = useMutation(api.slides.create);

  const withTimeout = async <T,>(promise: Promise<T>, message: string) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), 60_000);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
  };

  const importDeck = async (file: File) => {
    setBusy(true);
    setStatus("Checking file...");
    try {
      if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Choose a PDF file.");
      const slides: never[] = [];
      setStatus("Uploading PDF file...");
      const uploadUrl = await withTimeout(generateUploadUrl(), "Getting an upload URL timed out. Is Convex running?");
      const upload = await withTimeout(fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/pdf" }, body: file }), "Uploading the PDF file timed out.");
      if (!upload.ok) throw new Error("Could not upload the PDF file.");
      const { storageId } = await upload.json();
      setStatus("Saving deck to database...");
      await withTimeout(createDeck({ title: file.name.replace(/\.pdf$/i, ""), moduleKey, lessonId: lessonId as Id<"lessons"> | undefined, originalFileName: file.name, originalStorageId: storageId, slides }), "Saving the deck timed out. Is Convex running?");
      toast("success", `Uploaded ${file.name}.`);
    } catch (error: unknown) {
      toast("error", error instanceof Error ? error.message : "Could not upload the PDF file.");
    } finally {
      setBusy(false);
      setStatus("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">Native lecture slides</p>
        <p className="text-xs text-slate-500">{status || "Upload a PDF lecture deck."}</p>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importDeck(file); }} />
      <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        <Upload className="mr-1 h-4 w-4" aria-hidden="true" /> {busy ? "Uploading..." : "Upload PDF"}
      </Button>
    </div>
  );
}