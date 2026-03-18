"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// This is the magic fix
const TeacherDashboard = dynamic(
  () => import("@/components/Teacher").then((mod) => mod.TeacherDashboard),
  { ssr: false }
);

export default function TeacherPage() {
  const router = useRouter();
  const handleClose = () => router.push("/");

  return (
    <main className="min-h-screen bg-slate-50">
      <TeacherDashboard onClose={handleClose} />
    </main>
  );
}
