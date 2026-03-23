# Implementation Plan: Student UX Improvements

## Overview

Implement four additive student-facing improvements to PolymerLingo: review screen answer breakdowns, leaderboard current-user row, glossary view, and homepage curriculum preview. Pure helper functions are extracted to `app/lib/studentUtils.ts` to enable property-based testing with fast-check + Vitest.

## Tasks

- [x] 1. Create `app/lib/studentUtils.ts` with pure helper functions
  - Implement `computeRank(allProgress, userId)` — counts users with strictly greater XP + 1; returns `totalStudents + 1` if user has no record
  - Implement `filterGlossaryTerms(terms, query)` — case-insensitive substring filter on `term` field; returns all terms when query is empty string
  - Implement `sortModulesByOrder(modules)` — sorts ascending by `order` field, stable sort
  - Implement `buildCurriculumData(modules, lessons)` — maps each module to `{ ...module, lessonCount }` where count = lessons whose `section === module.moduleKey`
  - _Requirements: 5.4, 6.5, 6.6, 7.5, 7.2_

- [x] 2. Add `getTopStudentsWithCurrentUser` query to `app/convex/userProgress.ts`
  - [x] 2.1 Implement `getTopStudentsWithCurrentUser` query replacing `getTopStudents`
    - Fetch all `userProgress` records, sort by XP descending
    - Resolve caller identity via `ctx.auth.getUserIdentity()` (null if unauthenticated)
    - Use `computeRank` logic inline to compute current user's rank
    - Return `{ topStudents: Array<{ id, name, xp, isCurrentUser }>, currentUser: { rank, name, xp, inTopTen } | null }`
    - If current user has no progress record, return `currentUser` with `xp: 0`, `rank: totalStudents + 1`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.2 Write property test for `computeRank` (Property 4)
    - **Property 4: Leaderboard rank is consistent with XP ordering**
    - **Validates: Requirements 5.4**
    - Use `fc.array(arbitraryProgressRecord(), { minLength: 1 })` and `fc.string()` as userId
    - Assert `computeRank(records, userId) === records.filter(r => r.xp > (records.find(r => r.userId === userId)?.xp ?? 0)).length + 1`

- [x] 3. Update `app/components/StudentLeaderboard.tsx` to show current-user row
  - Switch `useQuery` call from `api.userProgress.getTopStudents` to `api.userProgress.getTopStudentsWithCurrentUser`
  - Highlight the current user's row in the top-10 list with an indigo ring when `student.isCurrentUser === true`
  - When `currentUser !== null && currentUser.inTopTen === false`, render an `<hr>` divider followed by a "you" row showing `Rank {n}`, name, and XP
  - When `currentUser === null` (unauthenticated), render the top-10 list unchanged
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Checkpoint — leaderboard feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add `getPublicCurriculum` query to `app/convex/modules.ts`
  - [x] 5.1 Implement `getPublicCurriculum` public query (no auth check)
    - Fetch all modules and all lessons from `ctx.db`
    - Sort modules ascending by `order` field
    - Map each module to `{ ...module, lessonCount }` where `lessonCount = lessons.filter(l => l.section === m.moduleKey).length`
    - Return the mapped array
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 5.2 Write property test for `buildCurriculumData` (Property 8)
    - **Property 8: Curriculum lesson counts are accurate**
    - **Validates: Requirements 7.2**
    - Use `fc.array(arbitraryModule())` and `fc.array(arbitraryLesson())` as inputs
    - Assert every result entry's `lessonCount === lessons.filter(l => l.section === m.moduleKey).length`

  - [ ]* 5.3 Write property test for `sortModulesByOrder` (Property 7)
    - **Property 7: Curriculum module order matches `order` field**
    - **Validates: Requirements 7.5**
    - Use `fc.array(arbitraryModule(), { minLength: 1 })` as input
    - Assert `result.every((m, i) => i === 0 || result[i - 1].order <= m.order)`

- [x] 6. Convert `app/components/Homepage.tsx` to a client component with curriculum preview
  - Add `"use client"` directive at the top of the file
  - Add `useQuery(api.modules.getPublicCurriculum)` hook
  - Add `curriculumRef = useRef<HTMLDivElement>(null)` and wire the existing "View Curriculum" button's `onClick` to `curriculumRef.current?.scrollIntoView({ behavior: 'smooth' })`
  - Add `<section id="curriculum" ref={curriculumRef}>` below the hero section
  - Render a responsive grid of module cards showing: code, title, description, and lesson count badge
  - When `getPublicCurriculum` returns `undefined` (loading), render skeleton placeholder cards
  - When `getPublicCurriculum` returns an empty array, render "Curriculum content coming soon" message
  - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7_

- [x] 7. Checkpoint — homepage curriculum preview complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extract `AnswerBreakdownCard` and refactor the `showReview` branch in `app/components/PolymerChemistryApp.tsx`
  - [x] 8.1 Define `AnswerBreakdownCard` inline component with props `{ index, question, studentAnswer, isCorrect }`
    - Render elements in order: (1) question number + question text, (2) CheckCircle2/XCircle status icon, (3) student answer section, (4) correct answer section, (5) explanation (omit if empty/missing)
    - MCQ student answer: `options[studentAnswer]` or "No answer submitted" if null
    - MCQ correct answer: `options[correct]`
    - fillblank student answer: entered string or "No answer submitted" if null/empty
    - fillblank correct answer: `correctAnswer` string
    - dragdrop student answer: list of `section.name: [answers]` pairs from student's placed sections; treat missing sections as empty
    - dragdrop correct answer: list of `section.name: [answers]` pairs from `question.sections`
    - Apply red tint + X icon to student answer row when incorrect; green styling when correct
    - Apply consistent card styling (border, padding, `bg-gray-50`) to all cards
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3_

  - [x] 8.2 Replace the per-question `div` in the `showReview` branch with `<AnswerBreakdownCard>`
    - Map `currentLesson.questions` to one `AnswerBreakdownCard` per question, preserving order
    - Pass pre-computed `isCorrect` using the existing `evaluateDragDropCorrectness` / fillblank / mcq logic
    - _Requirements: 4.1, 4.4_

  - [ ]* 8.3 Write property test for answer breakdown card count (Property 1)
    - **Property 1: Answer breakdown card count equals question count**
    - **Validates: Requirements 4.1, 4.4**
    - Use `fc.array(arbitraryQuestion(), { minLength: 1, maxLength: 20 })` as input
    - Assert `renderAnswerBreakdowns(questions, mockAnswers(questions)).length === questions.length`

  - [ ]* 8.4 Write property test for required card elements (Property 2)
    - **Property 2: Every card contains required elements**
    - **Validates: Requirements 1.1, 1.2, 2.1–2.5, 3.1–3.5, 4.2**
    - Use `arbitraryQuestion()` and `arbitraryStudentAnswer()` as inputs
    - Assert rendered card has question text, status icon, student answer section, and correct answer section

  - [ ]* 8.5 Write property test for explanation omission (Property 3)
    - **Property 3: Explanation omitted when empty**
    - **Validates: Requirements 1.3**
    - Use `arbitraryQuestionWithEmptyExplanation()` as input
    - Assert rendered card does not contain an explanation element

- [x] 9. Add Glossary state and `GlossaryView` to `app/components/PolymerChemistryApp.tsx`
  - [x] 9.1 Add `showGlossary` state and `glossaryTerms` query
    - Add `const [showGlossary, setShowGlossary] = useState(false)` to state section
    - Add `const glossaryTerms = useQuery(api.glossary.getAll)` to backend integration section
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 Implement `GlossaryView` inline component
    - Add local `searchQuery` state; filter `glossaryTerms` client-side using `filterGlossaryTerms` from `studentUtils.ts`
    - Show loading spinner while `glossaryTerms === undefined`
    - Render each term and definition; display "No terms found" when filtered list is empty and search is non-empty
    - Back button calls `setShowGlossary(false)`
    - Read-only — no add/edit/delete controls
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 9.3 Add Glossary navigation entry to mobile bottom bar and desktop header
    - Mobile bottom bar: add `Book` icon button for "Glossary" alongside the existing Home and Settings buttons, calling `setShowGlossary(true)`
    - Desktop header area: add a Glossary button consistent with the Settings gear button
    - Wire both to `setShowGlossary(true)`
    - _Requirements: 6.1_

  - [x] 9.4 Add `showGlossary` render branch to the component's state machine
    - Insert `if (showGlossary) { return <GlossaryView ... /> }` in the render section, consistent with the `showSettings` branch pattern
    - _Requirements: 6.1, 6.2_

  - [ ]* 9.5 Write property test for `filterGlossaryTerms` (Property 6)
    - **Property 6: Glossary search filters correctly**
    - **Validates: Requirements 6.5, 6.6, 6.7**
    - Use `fc.array(arbitraryGlossaryTerm())` and `fc.string()` as inputs
    - Assert `filterGlossaryTerms(terms, query)` returns exactly those terms whose `term.toLowerCase().includes(query.toLowerCase())`

  - [ ]* 9.6 Write property test for current user appearing exactly once (Property 5)
    - **Property 5: Current user appears exactly once in leaderboard data**
    - **Validates: Requirements 5.1, 5.3**
    - Use `fc.array(arbitraryProgressRecord(), { minLength: 1 })` and a userId drawn from the array
    - Assert the user's name/XP appears exactly once across the combined top-10 list and optional "you" row

- [x] 10. Final checkpoint — all features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests live in `app/lib/studentUtils.test.ts` alongside the existing `teacherUtils.test.ts` pattern, using fast-check + Vitest
- `getTopStudents` in `userProgress.ts` should be replaced by `getTopStudentsWithCurrentUser`; update the import in `StudentLeaderboard.tsx` accordingly
- `Homepage.tsx` must be a client component (`"use client"`) to use `useQuery` — this is safe since it is already rendered inside `ConvexClientProvider`
- The `GlossaryView` and `AnswerBreakdownCard` can be defined as inline components within their parent files to avoid prop-threading complexity, consistent with the existing architecture
