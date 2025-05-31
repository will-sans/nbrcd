# Database Changelog

This document tracks changes to the database schema for the NBRCD app.

## 2025-05-24
- **Added `goal` Column to `user_session_metadata` Table**
  - **Description**: Added a `goal` column (type: `text`) to the `user_session_metadata` table to store user goals for machine learning personalization and habit formation support.
  - **Purpose**: To enable the recommendation system to align actions and questions with the user’s goal, improving habit formation toward goal achievement.
  - **SQL**:
    ```sql
    alter table user_session_metadata add column goal text;

## 2025-05-24
- **Added Goal Setting UI in Settings Page**
  - **Description**: Added a UI section in `settings/page.tsx` to allow users to set or update their goal, which is saved to the `goal` column in the `user_session_metadata` table.
  - **Purpose**: To enable users to define their goals, which will be used to enhance machine learning recommendations and habit formation.
  - **Implementation**:
    - Fetched the current goal from `user_session_metadata` on page load.
    - Added a modal form to input and validate the goal (minimum 3 characters).
    - Saved the goal to `user_session_metadata` using an upsert operation.

## 2025-05-24
- **Updated Learning Session to Include Goal in Session Metadata**
  - **Description**: Modified `learning-session/page.tsx` to fetch and preserve the `goal` field in `user_session_metadata` during session updates.
  - **Purpose**: Ensure the user’s goal is consistently saved in session metadata, enabling future integration with machine learning recommendations for habit formation.
  - **Implementation**:
    - Updated the `SessionMetadata` interface to include the `goal` field.
    - Modified `loadSessionMetadata` to fetch the `goal` field.
    - Modified `saveSessionMetadata` to preserve the `goal` in upsert operations.

## 2025-05-24
- **Fixed Goal Update to Preserve Existing Metadata in Settings Page**
  - **Description**: Modified `app/settings/page.tsx` to preserve existing `summary`, `user_inputs`, and `selected_action` fields in `user_session_metadata` when updating the `goal` field.
  - **Purpose**: Ensure that updating the goal does not overwrite other metadata fields with empty values, maintaining data integrity.
  - **Implementation**:
    - Fetched current metadata before performing the upsert.
    - Included existing `summary`, `user_inputs`, and `selected_action` values in the upsert operation.

## 2025-05-24
- **Added Simple Recommendation Function to Learning Session Page**
  - **Description**: Modified `learning-session/page.tsx` to include a "Recommendation" button that fetches questions from the `questions` table based on the user’s `goal` and `summary` using embedding similarity search.
  - **Purpose**: Enhance user experience by suggesting relevant questions to start a new session, tailored to the user’s goals and past interactions.
  - **Implementation**:
    - Added a button below the message area to fetch recommended questions.
    - Used the existing `search_user_questions` RPC to perform similarity search with the user’s `goal` and `summary`.
    - Displayed recommended questions in a list, allowing the user to select one to start a new session.

## 2025-05-24
- **Updated Recommendation Function in Learning Session Page**
  - **Description**: Modified `learning-session/page.tsx` to show the "Recommendation" button immediately after loading, and updated the fetch logic to search all questions in the `questions` table using `/api/similarity-search`.
  - **Purpose**: Improve user experience by allowing recommendations before selecting a philosopher, and ensure broader question matching.
  - **Implementation**:
    - Moved the "Recommendation" button to appear after loading completes, regardless of philosopher selection.
    - Updated `fetchRecommendedQuestions` to use `/api/similarity-search` with the user’s `goal` and `summary`, removing the `philosophy` filter.
    - Improved error handling for better user feedback.

## 2025-05-24
- **Fixed TypeScript Error in `learning-session/page.tsx`**
  - **Description**: Resolved `@typescript-eslint/no-explicit-any` error by defining a `QuestionFromSupabase` type for the raw question data in `fetchRecommendedQuestions`.
  - **Purpose**: Ensure type safety and allow the build process to complete successfully, maintaining robust development.

## 2025-05-24
- **Removed `last_question_id` Usage in Learning Session Page**
  - **Description**: Modified `learning-session/page.tsx` to remove all usage of `last_question_id` and associated functions, ensuring that recommended questions are not overwritten by random questions.
  - **Purpose**: Fix the issue where selected recommended questions were being overwritten, allowing users to start sessions with their chosen question.
  - **Implementation**:
    - Removed `loadLastQuestionId` and `saveLastQuestionId` functions.
    - Updated `useEffect` to only fetch a random question if `dailyQuestion` is not set, preserving recommended question selections.
    - Simplified `handleSelectRecommendedQuestion` to remove unnecessary state management.

## 2025-05-24
- **Disabled Philosopher Selector After Question Selection**
  - **Description**: Modified `learning-session/page.tsx` to disable the philosopher selector after a question is selected, preventing changes until the session is reset.
  - **Purpose**: Improve user experience by ensuring consistency between the selected philosopher and the current question, avoiding confusion.
  - **Implementation**:
    - Updated the philosopher selector to be disabled when `dailyQuestion` is set or `sessionStarted` is true.
    - Ensured the selector is re-enabled after session reset by clearing `dailyQuestion` and `selectedPhilosopherId`.

## 2025-05-24
- **Fixed TypeScript Error for Philosopher Selector `disabled` Prop**
  - **Description**: Resolved TypeScript error in `learning-session/page.tsx` by ensuring the `disabled` prop of the philosopher selector evaluates to a boolean.
  - **Purpose**: Fix type mismatch error to allow successful builds while maintaining the intended behavior of disabling the selector after a question is selected.
  - **Implementation**:
    - Updated the `disabled` prop expression to `sessionStarted || dailyQuestion !== null` to ensure it resolves to a boolean.
    - Aligned `handlePhilosopherChange` logic for consistency.  

## 2025-05-25
### Changed
- Modified `/api/similarity-search` to fetch the top 30 matching questions and randomly select 3 for recommendations, addressing overfitting in `learning-session` recommendations (#ISSUE_NUMBER).
  - Updated `match_count` from 3 to 30 in Supabase RPC call.
  - Added `getRandomItems` utility to select random results.
- Enhanced `learning-session` UI to inform users that recommendations are randomized for variety.
- Added logging in `learning-session` to track recommended question IDs for analytics.
### Impact
- Increased variety in `learning-session` recommendations, reducing repetitive questions.
- No functional changes to `ConsultingSession`, but responses may include more varied context due to randomized results.

## 2025-05-25
### Fixed
- Removed unwanted trailing newline (`\n`) at the end of the "まとめ：" section in learning session replies by trimming the `summaryPart` in the `extractActions` function (`app/learning-session/page.tsx`). This ensures cleaner output in the UI.

## 2025-05-25
### Fixed FAQ
- Revised FAQ for wrong informaion(オフラインで一部の機能が使えますX→インターネットがないと使えません). 
  Add guidance of error recovary(Recommend button error recovery by clearing Safari history). 

## 2025-05-25
### Fixed
- Removed unwanted literal \n at the end of the "まとめ：" section in learning session replies by adding a replacement step in the extractActions function (app/learning-session/page.tsx). This ensures the summary output is clean and matches the intended format.

## 2025-05-26
### Fixed
- Resolved Invalid Refresh Token: Already Used error in fetchRecommendedQuestions function by removing X-Refresh-Token header and adding retry logic with session refresh for token-related errors.
- Improved session management to prevent reuse of invalidated refresh tokens in API requests.
### Changed
- enhanced error handling in fetchRecommendedQuestions to handle token refresh failures gracefully.
- Added timeout and abort controller to similarity search API request for better reliability.

## 2025-05-26
### Fixed
- Resolved ESLint error @typescript-eslint/no-explicit-any in pages/api/similarity-search.ts by changing catch (error: any) to catch (error: unknown) and updating error handling to safely check error properties.
- Resolved Invalid Refresh Token: Already Used error in fetchRecommendedQuestions function by removing X-Refresh-Token header and adding retry logic with session refresh for token-related errors.
- Improved session management to prevent reuse of invalidated refresh tokens in API requests.
### Added
- Enhanced /api/similarity-search endpoint with explicit user session validation using supabase.auth.getUser().
- Added specific error handling for invalid or already used refresh tokens, returning 401 status with detailed error messages.
### Changed
- Enhanced error handling in fetchRecommendedQuestions to handle token refresh failures gracefully.
- Added timeout and abort controller to similarity search API request for better reliability.

## 2025-05-26
### Added
- Implemented Web App Manifest (`manifest.json`) for PWA support.
- Added iOS-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-title`) to enable standalone mode.

## 2025-05-28
### Changed
- Replaced deprecated `<meta name="apple-mobile-web-app-capable">` with `<meta name="mobile-web-app-capable">` for PWA compatibility.
### Removed
- Removed `backup.json`, `backup.sql`, and `backup250510.json`.
- Added backup file patterns to `.gitignore`.

## 2025-05-29
### Added
- Added Privacy Policy page (`app/privacy-policy/page.tsx`) with content outlining personal information handling, usage purposes, and intellectual property rights.
- Added a Privacy Policy link to the Settings page menu (`app/settings/page.tsx`) for easy access.
### Changed
- Modified Settings page to include a Privacy Policy link in the menu, styled consistently with the app's design.

## 2025-05-29
### Added
- Added time tracking feature with a new "時間計測" button in the main menu (app/page.tsx).
- Created /time-tracker page for starting/stopping time tracking with todo integration, category selection, and custom task input (app/time-tracker/page.tsx).
- Created /schedule page for reviewing daily schedules with a timeline and category-based pie chart using Chart.js (app/schedule/page.tsx).
- Added time_sessions table in Supabase to store time tracking data (supabase/schema.sql).
### Changed
- Updated main menu navigation to include time tracking option (app/page.tsx).
- Modified time tracker page to only show todos with due dates on or before today, or tasks without due dates created on or before today, to keep the list concise (app/time-tracker/page.tsx).
- Updated time tracker to automatically mark todos as completed when a time tracking session ends, preventing auth_id errors (app/time-tracker/page.tsx).
- Fixed time tracker page to correctly display tasks due or created on or before today by adjusting date comparison to account for JST timezone and full day inclusion (app/time-tracker/page.tsx).
- Updated time tracker categories to ["開発", "会議", "事務", "作業", "雑用", "家事", "移動", "休憩"], made category selection start tracking immediately, and replaced custom task input with custom category input for a more intuitive and quick interface (app/time-tracker/page.tsx).
- Updated question_id_rule.md to add book of 05Collins 02 "ビジョナリー・カンパニー②飛躍の法則"
- Updated FAQ contents with PWA add to home description.
### Added
- Added Terms of Service link to the settings page menu, linking to a new `/terms-of-service` page (#ISSUE_NUMBER).
- Created a new Terms of Service page at `/terms-of-service` with placeholder content for user agreement terms 
### Changed
- Revised Terms of Service page (app/terms-of-service/page.tsx) to match the structure, styling, and navigation of the Privacy Policy page, including a back button to settings and consistent content formatting (#ISSUE_NUMBER).
### Changed
- Added auto-stop functionality to end time tracking sessions when navigating away from the time tracker page, preventing stale records and ensuring accurate measurements (app/time-tracker/page.tsx).
- Fixed TypeScript errors in time tracker page by replacing router.events with beforeunload and component unmount cleanup for auto-stopping sessions (app/time-tracker/page.tsx).
- Fixed pie chart date filtering in schedule page to correctly group sessions by JST date, ensuring data from May 29, 2025, 00:00 JST onward appears in the May 29 pie chart (app/schedule/page.tsx).
- Replaced beforeunload with session resumption and manual end/discard options in time tracker page to handle app closure scenarios, ensuring sessions are not left as "進行中" indefinitely (app/time-tracker/page.tsx).
- Fixed ESLint warning in time tracker page by memoizing stopTracking with useCallback and including it in the useEffect dependency array for component unmount cleanup (app/time-tracker/page.tsx).
- Fixed TypeScript errors in time tracker page by reordering function declarations to ensure startTracking and stopTracking are defined before their usage in useEffect and event handlers, resolving temporal dead zone and undefined name issues (app/time-tracker/page.tsx).
- Fixed ESLint warning in time tracker page by using a functional update for setTodos in stopTracking, removing the need for todos in the useCallback dependency array (app/time-tracker/page.tsx).
- Updated diary list page to show a single day’s work logs sorted by time schedule data from time_sessions, renamed title to "日誌", and simplified UI to a single date picker (app/diary/list/page.tsx).
- Updated diary input page to prefill time_allocation with time range from time_sessions for completed todos, enhancing integration with time tracking data (app/diary/page.tsx).
- Fixed diary list page to display only the selected date’s work logs (e.g., May 29, 2025) using date-only filtering and to show time_allocation from work_logs instead of time_sessions for the "時間" column, ensuring correct data display (app/diary/list/page.tsx).
- Fixed TypeScript error in diary list page by replacing nullsLast with nullsFirst: false in the Supabase order method, ensuring a clean build (app/diary/list/page.tsx).
- Fixed ESLint error in diary list page by removing unused _ variable in parseStartTime and improved sorting by parsing time_allocation start times more robustly, ensuring chronological order (e.g., 9:00–11:00 before 10:30–11:00) (app/diary/list/page.tsx).
## 2025-05-30
### Added
- Set default due date to today's date when adding a new task in the TodoListPage component.
  - Modified `handleAddTask` to include `dueDate` set to `new Date().toISOString().split('T')[0]` in the new todo object.
  - Updated Supabase insert to save `due_date` field.
### Fixed
- Corrected date range in `src/app/schedule/page.tsx` to align with JST midnight boundaries, ensuring sessions from 00:00 JST to 23:59 JST are displayed under the correct date.
### Added
- Implemented priority functionality for todos
- Added priority field to Todo and SupabaseTodo interfaces
- Added UI controls (up/down arrows) to adjust todo priority
- Modified todo sorting to prioritize by priority within date groups
- Added priority handling in database operations (fetch, add, update)
- Added priority sorting to TimeTrackerPage todo list
- Updated TimeTrackerPage to display priority value next to todos
### Changed
- Modified fetchTodos query to include priority in sorting
- Updated grouped todos sorting logic to consider priority first
- Added priority field to new todo creation with default value of 0
- Updated priority display to show between up/down buttons instead of in todo text
- Changed priority up button to red and down button to green
- Updated aria-labels to use "優先度" instead of "優先順位"
- Updated TimeTrackerPage categories to ["仕事", "会議", "日常", "学習", "家事", "移動", "健康", "休憩"]
## 2025-05-31
### Changed
- **Learning Session: Removed `relevantContext` Usage**
  - Updated the Supabase prompt (ID: 4) to remove the `relevantContext` section, as session history indicated it provided minimal value.
  - Modified `app/learning-session/page.tsx` to remove the `relevantContext` fetching logic in `handleStartSession` and its substitution in the system prompt.
  - Removed the `SimilaritySearchResult` interface, as it was only used for `relevantContext`.
  - Updated prompt description to reflect the exclusion of `relevantContext` for cleaner output.
  - Impact: Streamlines the prompt and session logic, reducing unnecessary API calls and simplifying the system prompt construction.
  - Testing: Verify that learning sessions function correctly without `relevantContext`, ensuring proper message handling and action plan generation.
- **Learning Session: Removed `userSummary` Usage**
  - Updated the Supabase prompt (ID: 4) to remove the `userSummary` section, as session history indicated it provided minimal value.
  - Modified `app/learning-session/page.tsx` to remove the `userSummary` variable and its substitution in the system prompt within `handleStartSession`.
  - Updated prompt description to reflect the exclusion of both `relevantContext` and `userSummary` for cleaner output.
  - Impact: Further streamlines the prompt and session logic, reducing unnecessary metadata processing and simplifying the system prompt construction.
  - Testing: Verify that learning sessions function correctly without `userSummary`, ensuring proper message handling, action plan generation, and metadata modal display.