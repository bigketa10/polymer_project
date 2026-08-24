"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Presentation, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/teacher/ConfirmDialog";
import { ToastContainer } from "@/components/teacher/InlineToast";
import { useToast } from "@/components/teacher/useToast";

export function SlideDecks() {
  const decks = useQuery(api.slides.list);
  const lessons = useQuery(api.lessons.getAll);
  const pdfDecks = decks?.filter((deck) => deck.originalFileName.toLowerCase().endsWith(".pdf"));
  const removeDeck = useMutation(api.slides.remove);
  const moveDeck = useMutation(api.slides.move);
  const [deckToRemove, setDeckToRemove] = useState<{ id: string; title: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const handleRemove = async () => {
    if (!deckToRemove) return;
    setIsRemoving(true);
    try {
      await removeDeck({ id: deckToRemove.id as Id<"slideDecks"> });
      toast("success", `Removed ${deckToRemove.title}.`);
      setDeckToRemove(null);
    } catch (error: unknown) {
      toast("error", error instanceof Error ? error.message : "Could not remove the deck.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleMove = async (deckId: string, lessonId: string) => {
    try {
      await moveDeck({ id: deckId as Id<"slideDecks">, lessonId: lessonId === "unassigned" ? undefined : lessonId as Id<"lessons"> });
      toast("success", "Lecture deck moved.");
    } catch (error: unknown) {
      toast("error", error instanceof Error ? error.message : "Could not move the deck.");
    }
  };

  if (!pdfDecks?.length) return <p className="text-sm text-slate-500">No PDF lecture decks yet.</p>;
  return <>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    <ConfirmDialog
      open={deckToRemove !== null}
      title="Remove lecture deck"
      description={`Remove "${deckToRemove?.title}"? The stored PDF will be deleted.`}
      destructive
      onCancel={() => { if (!isRemoving) setDeckToRemove(null); }}
      onConfirm={() => { if (!isRemoving) void handleRemove(); }}
    />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pdfDecks.map((deck) => (
      <div key={deck._id} className="rounded-lg border bg-white p-4 transition hover:border-blue-400 hover:shadow-sm">
        <Link href={`/teacher/slides/${deck._id}`} className="block">
          <Presentation className="mb-3 h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900">{deck.title}</h2>
          <p className="mt-1 text-xs text-slate-500">PDF lecture deck · {deck.originalFileName}</p>
        </Link>
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Move to lesson
          <select value={deck.lessonId ?? "unassigned"} onChange={(event) => void handleMove(deck._id, event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">
            <option value="unassigned">No lesson assigned</option>
            {lessons?.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}
          </select>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 text-red-600 hover:text-red-700"
          aria-label={`Remove ${deck.title}`}
          onClick={() => setDeckToRemove({ id: deck._id, title: deck.title })}
        >
          <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" /> Remove
        </Button>
      </div>
    ))}</div>
  </>;
}