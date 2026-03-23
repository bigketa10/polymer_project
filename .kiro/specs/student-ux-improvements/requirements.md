# Requirements Document

## Introduction

This feature improves the student-facing experience in PolymerLingo across four areas:

1. **Review Screen** (Requirements 1–4): The post-quiz review screen (`showReview` state in `PolymerChemistryApp.tsx`) currently only shows a correct/incorrect icon per question — it does not reveal the correct answer or the explanation stored on each question. This spec adds full answer breakdowns and explanations for all three question types (MCQ, fill-in-the-blank, drag-and-drop).

2. **Leaderboard** (Requirement 5): The leaderboard (`StudentLeaderboard.tsx`) shows the top 10 students by XP but does not show the current user's position if they fall outside the top 10. This spec ensures the current user's rank is always visible.

3. **Glossary** (Requirement 6): The glossary exists in the backend (`convex/glossary.ts`) but is not surfaced anywhere in the student UI. This spec adds a read-only glossary view accessible from the student navigation.

4. **Homepage Curriculum Preview** (Requirement 7): The homepage (`Homepage.tsx`) has a "View Curriculum" button that does nothing and a placeholder image. This spec adds a curriculum preview section visible to unauthenticated visitors, showing available modules and their lessons.

## Glossary

- **Review_Screen**: The post-quiz summary rendered when `showReview` is `true` inside `PolymerChemistryApp.tsx`.
- **Question**: A single quiz item stored in `lesson.questions[]`, which may be of type `mcq`, `fillblank`, or `dragdrop`.
- **Correct_Answer**: The authoritative answer for a Question — `options[correct]` for MCQ, `correctAnswer` string for fillblank, and the `sections` array for dragdrop.
- **Student_Answer**: The value stored in `selectedAnswers[questionIndex]` at the time the lesson is completed.
- **Explanation**: The `explanation` string field present on every Question, currently only shown inline during the quiz, not on the Review_Screen.
- **Answer_Breakdown**: A per-question card on the Review_Screen that shows the Question text, the Student_Answer, the Correct_Answer, and the Explanation.
- **Leaderboard**: The modal overlay rendered by `StudentLeaderboard.tsx`, showing ranked students by XP.
- **Current_User**: The authenticated student currently using the app, identified via Clerk (`user.id` / `identity.subject`).
- **Top_10**: The ten students with the highest XP as returned by `api.userProgress.getTopStudents`.
- **Glossary_View**: A read-only UI screen that displays all terms and definitions from `api.glossary.getAll`.
- **Student_Nav**: The navigation controls available to authenticated students — currently the mobile bottom bar (Home + Settings) and any equivalent desktop navigation within `PolymerChemistryApp.tsx`.
- **Curriculum_Preview**: A section on the public homepage that displays available modules and a sample of their lessons, visible without authentication.
- **Module**: A top-level grouping of lessons, stored in the `modules` table and fetched via `api.modules.getAll`.
- **Lesson**: A single learning unit belonging to a Module, stored in the `lessons` table.

## Requirements

### Requirement 1: Display explanation for every question on the Review Screen

**User Story:** As a student, I want to see the explanation for every question after I finish a lesson, so that I can understand the reasoning behind each answer and reinforce my learning.

#### Acceptance Criteria

1. WHEN the Review_Screen is displayed, THE Review_Screen SHALL render the Explanation text for every Question in the lesson, regardless of whether the student answered correctly or incorrectly.
2. THE Review_Screen SHALL display the Explanation in a visually distinct area below the correct/incorrect indicator within each Answer_Breakdown card.
3. IF a Question has an empty or missing Explanation, THEN THE Review_Screen SHALL omit the explanation area for that Question without rendering an empty element.

---

### Requirement 2: Display the correct answer for every question on the Review Screen

**User Story:** As a student, I want to see what the right answer was for each question, so that I can compare it against what I submitted and understand where I went wrong.

#### Acceptance Criteria

1. WHEN the Review_Screen is displayed and a Question is of type `mcq`, THE Review_Screen SHALL display the text of `options[correct]` as the Correct_Answer for that Question.
2. WHEN the Review_Screen is displayed and a Question is of type `fillblank`, THE Review_Screen SHALL display the `correctAnswer` string as the Correct_Answer for that Question.
3. WHEN the Review_Screen is displayed and a Question is of type `dragdrop`, THE Review_Screen SHALL display each section name alongside its correct answers as the Correct_Answer for that Question.
4. THE Review_Screen SHALL label the Correct_Answer display with a clear visual indicator (such as a green checkmark icon or "Correct answer:" label) so students can distinguish it from their own submitted answer.
5. THE Review_Screen SHALL display the Correct_Answer for every Question, including Questions the student answered correctly.

---

### Requirement 3: Display the student's submitted answer on the Review Screen

**User Story:** As a student, I want to see what I actually answered for each question, so that I can compare my response directly against the correct answer.

#### Acceptance Criteria

1. WHEN the Review_Screen is displayed and a Question is of type `mcq`, THE Review_Screen SHALL display the text of the option the student selected as the Student_Answer, or "No answer submitted" if `selectedAnswers[questionIndex]` is `null`.
2. WHEN the Review_Screen is displayed and a Question is of type `fillblank`, THE Review_Screen SHALL display the text the student entered as the Student_Answer, or "No answer submitted" if the value is `null` or an empty string.
3. WHEN the Review_Screen is displayed and a Question is of type `dragdrop`, THE Review_Screen SHALL display each section name alongside the answers the student placed in it as the Student_Answer.
4. IF the Student_Answer is incorrect, THEN THE Review_Screen SHALL visually distinguish the Student_Answer from the Correct_Answer (for example, using a red tint or an X icon on the student's answer row).
5. IF the Student_Answer is correct, THEN THE Review_Screen SHALL render the Student_Answer with the same positive styling as the Correct_Answer indicator.

---

### Requirement 4: Answer_Breakdown cards are structurally consistent across question types

**User Story:** As a student, I want the review layout to feel consistent regardless of question type, so that I can scan through my results quickly without re-learning a new layout for each card.

#### Acceptance Criteria

1. THE Review_Screen SHALL render one Answer_Breakdown card per Question in the lesson, in the same order as the questions appeared during the quiz.
2. WHEN rendering an Answer_Breakdown card, THE Review_Screen SHALL display the following elements in order: (1) question number and question text, (2) correct/incorrect status icon, (3) Student_Answer, (4) Correct_Answer, (5) Explanation.
3. THE Review_Screen SHALL apply consistent card styling (border, padding, background) to all Answer_Breakdown cards regardless of question type.
4. FOR ALL valid lesson question arrays, rendering the Review_Screen SHALL produce exactly as many Answer_Breakdown cards as there are questions in the lesson (round-trip property: question count in equals card count out).

---

### Requirement 5: Leaderboard — current user row always visible

**User Story:** As a student, I want to always see my own rank on the leaderboard, so that I know where I stand even if I'm not in the top 10.

#### Acceptance Criteria

1. WHEN the Leaderboard is displayed and the Current_User is not in the Top_10, THE Leaderboard SHALL append the Current_User's row at the bottom of the ranked list, visually separated from the Top_10 by a divider (e.g. a "…" row or a horizontal rule).
2. WHEN the Leaderboard is displayed and the Current_User is not in the Top_10, THE Current_User's row SHALL display their actual numeric rank (e.g. "Rank 14"), their display name, and their XP.
3. WHEN the Leaderboard is displayed and the Current_User IS in the Top_10, THE Leaderboard SHALL highlight the Current_User's row within the normal ranked list and SHALL NOT append a duplicate row at the bottom.
4. THE Leaderboard SHALL determine the Current_User's rank by counting all students with strictly greater XP than the Current_User and adding one.
5. WHEN the backend query is extended or a new query is added to support this feature, THE query SHALL return the Current_User's rank and XP alongside the Top_10 data in a single response, without requiring a second round-trip from the client.
6. IF the Current_User has no progress record, THEN THE Leaderboard SHALL display the Current_User's row with 0 XP and a rank equal to the total number of students plus one.

---

### Requirement 6: Glossary — read-only view in student navigation

**User Story:** As a student, I want to browse the glossary of polymer chemistry terms from within the app, so that I can look up definitions without leaving the learning environment.

#### Acceptance Criteria

1. THE Student_Nav SHALL include a "Glossary" entry that navigates to the Glossary_View.
2. WHEN the Glossary_View is displayed, THE Glossary_View SHALL fetch and display all terms via `api.glossary.getAll`, showing each term and its definition.
3. THE Glossary_View SHALL display terms in alphabetical order (ascending by term name).
4. THE Glossary_View SHALL be read-only — it SHALL NOT provide controls to add, edit, or delete terms.
5. THE Glossary_View SHALL include a text input that filters the displayed terms in real time, showing only terms whose name contains the search string (case-insensitive).
6. WHEN the search input is empty, THE Glossary_View SHALL display all terms.
7. IF no terms match the current search string, THEN THE Glossary_View SHALL display a "No terms found" message.
8. WHEN the Glossary_View is loading data, THE Glossary_View SHALL display a loading indicator until the data is available.

---

### Requirement 7: Homepage — curriculum preview section

**User Story:** As a prospective student, I want to see what modules and lessons are available before signing up, so that I can understand the scope of the course before committing.

#### Acceptance Criteria

1. THE Homepage SHALL include a Curriculum_Preview section that is visible to unauthenticated users without requiring sign-in.
2. WHEN the Curriculum_Preview section is rendered, THE Homepage SHALL display each Module's code, title, description, and lesson count.
3. THE Curriculum_Preview section SHALL fetch module and lesson data via a public Convex query that does not require authentication — IF the existing `api.modules.getAll` or `api.lessons.getAll` queries require an authenticated identity, THEN a new public query SHALL be added to `convex/modules.ts` or `convex/lessons.ts` to serve this data.
4. WHEN a user clicks the "View Curriculum" button in the hero section, THE Homepage SHALL scroll to the Curriculum_Preview section.
5. THE Curriculum_Preview section SHALL display modules in ascending order by their `order` field.
6. WHEN the Curriculum_Preview data is loading, THE Homepage SHALL display a loading skeleton or placeholder in place of the module cards.
7. IF no modules are available, THEN THE Homepage SHALL display a message indicating that curriculum content is coming soon.
