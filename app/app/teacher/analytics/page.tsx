import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/teacher/AnalyticsDashboard";
import { ResetProgressButton } from "@/components/teacher/ResetProgressButton";

export const metadata: Metadata = {
  title: "Analytics — PolymerLingo",
};

export default function AnalyticsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Analytics Dashboard
        </h1>
        <ResetProgressButton />
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
