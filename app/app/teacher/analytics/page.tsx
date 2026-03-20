import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/teacher/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics — PolymerLingo",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
