import type { Metadata } from "next";
import { ContentManager } from "@/components/teacher/ContentManager";

export const metadata: Metadata = {
  title: "Content Manager — PolymerLingo",
};

export default function ContentPage() {
  return <ContentManager />;
}
