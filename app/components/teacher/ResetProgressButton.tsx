"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConfirmDialog } from "@/components/teacher/ConfirmDialog";
import { useToast } from "@/components/teacher/useToast";
import { ToastContainer } from "@/components/teacher/InlineToast";

export function ResetProgressButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  // NOTE: Adjust the mutation path below to match your actual Convex schema
  // e.g., api.progress.resetAll or api.users.resetProgress
  const resetProgress = useMutation(api.lessonAttempts.resetAllProgress);

  const handleReset = async () => {
    try {
      await resetProgress();
      toast("success", "User progress has been successfully reset.");
    } catch (error: any) {
      toast("error", error.message || "Failed to reset progress.");
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
      >
        Reset User Progress
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Reset User Progress"
        description="Are you sure you want to reset user progress? This action cannot be undone and will wipe student scores."
        onConfirm={handleReset}
        onCancel={() => setShowConfirm(false)}
        destructive
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
