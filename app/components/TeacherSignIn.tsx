"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TeacherDashboard } from "@/components/Teacher";

export default function TeacherPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && (!isSignedIn || user?.publicMetadata?.role !== "admin")) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) return <div>Checking permissions...</div>;
  if (!isSignedIn || user?.publicMetadata?.role !== "admin") return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <TeacherDashboard onClose={() => router.push("/")} />
    </main>
  );
}
