# Requirements Document

## Introduction

The PolymerLingo teacher dashboard currently exists as a single monolithic component (`Teacher.tsx`, ~3300 lines) rendered at `/teacher`. This makes it difficult to navigate, slow to reason about, and cognitively overwhelming for teachers who need to switch between managing course content and reviewing student analytics. This feature splits the teacher experience into distinct, focused pages with improved navigation, layout, and usability for both content management and analytics workflows.

## Glossary

- **Teacher_Dashboard**: The top-level teacher interface, accessible at `/teacher`
- **Content_Manager**: The sub-page for managing modules, lessons, questions, and glossary, accessible at `/teacher/content`
- **Analytics_Dashboard**: The sub-page for viewing class stats, student reports, and per-lesson performance, accessible at `/teacher/analytics`
- **Teacher_Nav**: The persistent navigation sidebar or header present on all teacher pages
- **Lesson_Editor**: The modal or inline UI for creating and editing lesson questions
- **Student_Report**: The per-student view showing attempt history and question-level responses
- **Class_Stats**: The aggregate view showing total students, average XP, and at-risk counts

---

## Requirements

### Requirement 1: Teacher Navigation Structure

**User Story:** As a teacher, I want a clear top-level navigation between content management and analytics, so that I can quickly switch between tasks without scrolling through a single overwhelming page.

#### Acceptance Criteria

1. THE Teacher_Nav SHALL render a navigation menu with at minimum two items: "Content" (linking to `/teacher/content`) and "Analytics" (linking to `/teacher/analytics`)
2. THE Teacher_Nav SHALL highlight the currently active route to indicate which section the teacher is viewing
3. THE Teacher_Nav SHALL include a link back to the student-facing homepage (`/`)
4. WHEN a teacher navigates to `/teacher`, THE Teacher_Dashboard SHALL redirect to `/teacher/content` as the default sub-page
5. THE Teacher_Nav SHALL be visible on all pages under the `/teacher` route without requiring a scroll

---

### Requirement 2: Content Management Page

**User Story:** As a teacher, I want a dedicated page for managing modules, lessons, and questions, so that I can focus on content authoring without analytics data cluttering the view.

#### Acceptance Criteria

1. THE Content_Manager SHALL display the list of modules and their associated lessons in a structured layout
2. THE Content_Manager SHALL provide controls to create, edit, reorder, and delete modules
3. THE Content_Manager SHALL provide controls to create, edit, reorder, and delete lessons within a module
4. WHEN a teacher selects a lesson, THE Content_Manager SHALL display the list of questions for that lesson
5. THE Content_Manager SHALL provide controls to add, edit, and delete questions of type MCQ, drag-and-drop, and fill-in-the-blank
6. THE Content_Manager SHALL provide a section for managing the glossary (create, edit, delete terms)
7. WHEN a teacher saves a module, lesson, or question, THE Content_Manager SHALL display a non-blocking success confirmation (not a browser `alert()`)
8. IF a required field is missing when saving a module, lesson, or question, THEN THE Content_Manager SHALL display an inline validation error adjacent to the relevant field

---

### Requirement 3: Analytics Page

**User Story:** As a teacher, I want a dedicated analytics page showing class performance and individual student reports, so that I can identify struggling students and understand how lessons are performing.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display Class_Stats including: total enrolled students, average XP across all students, number of at-risk students (fewer than 100 XP), and total lesson count
2. THE Analytics_Dashboard SHALL display a ranked leaderboard of all students showing name, XP, streak, completed lesson count, and overall progress percentage
3. THE Analytics_Dashboard SHALL provide a search input that filters the student leaderboard by student name in real time
4. WHEN a teacher selects a student from the leaderboard, THE Analytics_Dashboard SHALL display a Student_Report for that student
5. THE Student_Report SHALL show each lesson the student has attempted, including their latest score, number of attempts, and time of last attempt
6. WHEN a teacher expands a lesson in the Student_Report, THE Analytics_Dashboard SHALL show the student's answer for each question, whether it was correct, and the time spent on that question
7. THE Analytics_Dashboard SHALL display per-lesson aggregate data for a selected lesson, showing the response distribution across all students for each question
8. WHEN no student is selected, THE Analytics_Dashboard SHALL display the Class_Stats and leaderboard as the default view

---

### Requirement 4: Inline Feedback Replacing Browser Dialogs

**User Story:** As a teacher, I want all confirmations and errors to appear within the page UI, so that I am not interrupted by browser-native `alert()` and `confirm()` dialogs that break the flow of work.

#### Acceptance Criteria

1. THE Content_Manager SHALL replace all `alert()` calls with inline toast notifications or status messages rendered within the page
2. THE Content_Manager SHALL replace all `confirm()` calls for destructive actions (delete module, delete lesson, delete question, delete glossary term) with an inline confirmation dialog or popover that requires explicit confirmation
3. WHEN a destructive action is confirmed, THE Content_Manager SHALL execute the action and display a non-blocking success notification
4. IF a destructive action fails, THEN THE Content_Manager SHALL display an inline error message describing the failure

---

### Requirement 5: Page Metadata and App Identity

**User Story:** As a teacher, I want the browser tab to show a meaningful title for each page, so that I can identify the correct tab when multitasking.

#### Acceptance Criteria

1. THE Teacher_Dashboard SHALL set the page `<title>` to "PolymerLingo — Teacher Dashboard" for all pages under `/teacher`
2. THE Content_Manager SHALL set the page `<title>` to "Content Manager — PolymerLingo"
3. THE Analytics_Dashboard SHALL set the page `<title>` to "Analytics — PolymerLingo"
4. THE Teacher_Dashboard SHALL replace the default Next.js metadata ("Clerk Next.js Quickstart") with "PolymerLingo" in the root layout

---

### Requirement 6: Responsive Layout for Teacher Pages

**User Story:** As a teacher, I want the dashboard to be usable on a laptop screen without horizontal scrolling or overlapping elements, so that I can work efficiently without a large external monitor.

#### Acceptance Criteria

1. THE Teacher_Nav SHALL render as a top navigation bar on screens narrower than 1024px and as a sidebar on screens 1024px and wider
2. THE Content_Manager SHALL use a two-column layout on screens 1024px and wider, with the module/lesson list in the left column and the question editor in the right column
3. THE Analytics_Dashboard SHALL use a two-column layout on screens 1024px and wider, with the student list on the left and the Student_Report on the right
4. WHILE the viewport width is less than 768px, THE Content_Manager SHALL stack all columns vertically
5. WHILE the viewport width is less than 768px, THE Analytics_Dashboard SHALL stack all columns vertically
