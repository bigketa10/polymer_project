import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/teacher/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics — PolymerLingo",
};

/**
 * Analytics page for the teacher dashboard (`/teacher/analytics`).
 * Renders the `AnalyticsDashboard` client component which displays class stats,
 * the student leaderboard, per-student reports, and lesson response distributions.
 */
export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
