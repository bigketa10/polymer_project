/**
 * TeacherLayout — shared layout for all `/teacher` routes.
 *
 * Renders `TeacherNav` alongside a `<main>` content area. On screens ≥1024px
 * the nav appears as a left sidebar; on smaller screens it collapses to a top
 * bar. Sets the base page title for all teacher pages.
 */
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
    <div className="flex flex-col lg:flex-row min-h-screen overflow-x-hidden">
      <TeacherNav />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
