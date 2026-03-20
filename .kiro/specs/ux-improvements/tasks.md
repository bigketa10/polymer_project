# Implementation Plan: UX Improvements

## Overview

Refactor the monolithic `Teacher.tsx` into focused sub-pages (`/teacher/content`, `/teacher/analytics`) with a shared `TeacherNav`, replace all `alert()`/`confirm()` calls with inline feedback components, fix page metadata, and add responsive layouts. The Convex schema and backend functions are unchanged.

## Tasks

- [x] 1. Set up teacher layout and routing
  - Update `app/app/teacher/page.tsx` to use `redirect("/teacher/content")` from `next/navigation` (Server Component)
  - Create `app/app/teacher/layout.tsx` as a Server Component that renders `TeacherNav` and a `<main>` wrapper around `{children}`
  - Create `app/app/teacher/content/page.tsx` as a Server Component with `metadata` export and a client `ContentManager` import placeholder
  - Create `app/app/teacher/analytics/page.tsx` as a Server Component with `metadata` export and a client `AnalyticsDashboard` import placeholder
  - Update root `app/app/layout.tsx` metadata title from "Clerk Next.js Quickstart" to "PolymerLingo"
  - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement TeacherNav component
  - Create `app/components/teacher/TeacherNav.tsx` as a `"use client"` component
  - Use `usePathname()` to detect active route and apply active styles
  - Render "Content" link → `/teacher/content`, "Analytics" link → `/teacher/analytics`, "Back to App" link → `/`
  - Apply `aria-current="page"` to the active nav item
  - Use Tailwind: sidebar (`lg:flex-col lg:w-64`) on ≥1024px, top bar (`flex-row`) on <1024px
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 6.1_

  - [ ]* 2.1 Write property test for TeacherNav active route (Property 1)
    - **Property 1: Active nav item reflects current route**
    - For any pathname in `["/teacher/content", "/teacher/analytics"]`, exactly one nav item has `aria-current="page"` and its `href` matches the pathname
    - **Validates: Requirements 1.2**

- [x] 3. Implement InlineToast and ConfirmDialog
  - Create `app/components/teacher/InlineToast.tsx` with `ToastMessage` interface (`id`, `variant: "success" | "error" | "info"`, `message`) and auto-dismiss after 4 seconds
  - Create `app/components/teacher/useToast.ts` hook returning `{ toasts, toast, dismiss }`
  - Create `app/components/teacher/ConfirmDialog.tsx` accepting `{ open, title, description, onConfirm, onCancel, destructive? }` props
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.1 Write property test for save operations produce inline feedback (Property 2)
    - **Property 2: Save operations produce inline feedback, not browser dialogs**
    - For any valid `{ code, title, description }` input, calling `toast()` adds an entry to the toast list and `window.alert` is never called
    - **Validates: Requirements 2.7, 4.1**

  - [ ]* 3.2 Write property test for validation errors appear inline (Property 3)
    - **Property 3: Validation errors appear inline, not as browser dialogs**
    - For any save attempt with empty required fields, a field error is present in state and `window.alert` is never called
    - **Validates: Requirements 2.8, 4.1**

  - [ ]* 3.3 Write property test for destructive actions require inline confirmation (Property 4)
    - **Property 4: Destructive actions require inline confirmation**
    - For any delete trigger on `["module", "lesson", "question", "glossary"]`, `ConfirmDialog` is rendered before the mutation fires and `window.confirm` is never called
    - **Validates: Requirements 4.2, 4.3**

- [x] 4. Extract and implement AnalyticsDashboard component
  - Create `app/components/teacher/AnalyticsDashboard.tsx` as a `"use client"` component
  - Move all analytics state and logic from `Teacher.tsx`: `searchQuery`, `selectedStudentUserId`, `selectedStudentName`, `studentReportAttemptFilter`, `expandedReportLessons`, `selectedLessonId` (analytics context), and all related `useMemo` computations (`reportLessons`, `reportAttemptOptions`, `displayedStudentReportLessons`, `lessonResponsesByQuestion`, `studentNameByUserId`)
  - Implement Class_Stats card row (total students, average XP, at-risk count, lesson count) — Requirement 3.1
  - Implement student leaderboard with search input filtering by `userName` — Requirements 3.2, 3.3
  - Implement Student_Report panel with per-lesson rows, expandable question-level detail — Requirements 3.4, 3.5, 3.6
  - Implement per-lesson aggregate response distribution view — Requirement 3.7
  - Default view (no student selected) shows Class_Stats + leaderboard — Requirement 3.8
  - Apply two-column layout on ≥1024px (`lg:grid-cols-2`), stacked on <768px — Requirement 6.3, 6.5
  - Wire `AnalyticsDashboard` into `app/app/teacher/analytics/page.tsx`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.3, 6.5_

  - [ ]* 4.1 Write property test for leaderboard sorted by XP descending (Property 5)
    - **Property 5: Leaderboard is sorted by XP descending**
    - Extract `sortLeaderboard(students)` pure function; for any array of students with integer XP ≥ 0, the output is sorted such that `sorted[i].xp >= sorted[i+1].xp` for all `i`
    - **Validates: Requirements 3.2**

  - [ ]* 4.2 Write property test for student leaderboard search filters by name (Property 6)
    - **Property 6: Student leaderboard search filters by name**
    - Extract `filterStudents(students, query)` pure function; for any query string and student array, every result's `userName` includes the query (case-insensitive), and no non-matching student appears
    - **Validates: Requirements 3.3**

  - [ ]* 4.3 Write property test for student report shows only attempted lessons (Property 7)
    - **Property 7: Student report shows only attempted lessons**
    - Extract `buildStudentReport(attempts, lessons)` pure function; for any attempt array, the report rows correspond exactly to the set of `lessonId`s present in the attempts — no more, no less
    - **Validates: Requirements 3.4, 3.5**

- [x] 5. Checkpoint — ensure analytics and nav work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extract and implement ContentManager component
  - Create `app/components/teacher/ContentManager.tsx` as a `"use client"` component
  - Move all content-management state and logic from `Teacher.tsx`: module form state, lesson form state, question editor state (`questionType`, `questionText`, `ddSections`, `ddAnswerBank`, etc.), glossary state, drag-reorder handlers, image upload logic
  - Replace every `alert(...)` call with `toast("success" | "error", ...)` using `useToast()`
  - Replace every `window.confirm(...)` call with `ConfirmDialog` — store pending action in state, render `<ConfirmDialog>` conditionally, execute action only on `onConfirm`
  - Add `fieldErrors` state map; run required-field validation before mutations and render `<p className="text-red-500 text-xs mt-1">` adjacent to each invalid field instead of calling `alert()`
  - Apply two-column layout on ≥1024px (module/lesson list left, question editor right), stacked on <768px — Requirements 6.2, 6.4
  - Wire `ContentManager` into `app/app/teacher/content/page.tsx`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 6.2, 6.4_

- [x] 7. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Pure helper functions (`sortLeaderboard`, `filterStudents`, `buildStudentReport`) should be extracted into `app/lib/teacherUtils.ts` to make them independently testable
- Property tests use **fast-check** with Vitest; run with `npx vitest --run` from `app/`
- `Teacher.tsx` is kept intact throughout — the new components are additive until verified
- All Convex queries/mutations are unchanged; only the component layer changes
