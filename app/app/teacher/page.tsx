import { redirect } from "next/navigation";

/**
 * Teacher dashboard entry point.
 * Immediately redirects to `/teacher/content` as the default sub-page.
 * This is a Server Component — no client-side logic needed.
 */
export default function TeacherPage() {
  redirect("/teacher/content");
}
