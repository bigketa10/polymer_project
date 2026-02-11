"use client";

import { useRouter } from "next/navigation";
import { TeacherDashboard } from "@/components/Teacher";
// Note: Double check the path above!
// If your Teacher.tsx is in 'components/', use '@/components/Teacher'
// If it is in 'app/', use '@/app/Teacher'

export default function TeacherPage() {
  const router = useRouter();

  // This handles what happens when you click 'Exit' in the dashboard
  const handleClose = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <TeacherDashboard onClose={handleClose} />
    </main>
  );
}
