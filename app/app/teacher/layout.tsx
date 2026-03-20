import type { Metadata } from "next";
import { TeacherNav } from "@/components/teacher/TeacherNav";

export const metadata: Metadata = {
  title: "PolymerLingo — Teacher Dashboard",
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <TeacherNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
