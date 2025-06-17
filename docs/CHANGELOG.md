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
  ### Changed
- **Learning Session: Consolidated Session Saving to End of Session**
  - Modified `app/learning-session/page.tsx` to remove `sessions` table insertion from the `saveLog` function, which was causing empty and duplicate records.
  - Added `sessions` table insertion to `saveActionToLocalStorageAndRedirect`, ensuring a single, complete session record is saved only when an action plan is selected.
  - Impact: Reduces unnecessary data storage in the `sessions` table, eliminating empty and duplicate records while maintaining session data integrity.
  - Testing: Verify that the `sessions` table receives one record per completed session, with complete conversation data, and no records for incomplete sessions. Confirm that logging, todo saving, and metadata functions remain unaffected.

## 2025-06-01
### Changed
- Enhanced `/api/similarity-search` to explicitly set Supabase session using `access_token` and `refresh_token` from headers to improve session validation reliability.
- Updated `fetchRecommendedQuestions` in `LearningSession` to proactively refresh the Supabase session before making API calls, ensuring fresh tokens are used and simplifying retry logic.
### Fixed
- Resolved TypeScript error (code 1472) in `fetchRecommendedQuestions` by removing unnecessary inner `try` block and merging logic into the outer `try-catch`, ensuring proper error handling and compilation.
### Changed
- Updated `getSupabaseClient` to explicitly set `storage` to `localStorage` for client-side session persistence and added `storageKey` for consistent token storage.
### Added
- Added `TOKEN_REFRESHED` event handling in `LearningSession` to update the session when Supabase automatically refreshes tokens.

## 2025-06-02
### Fixed
- **TodoListPage**: Corrected `handleAddTask` and `handleToggle` to properly set `due_date` and `completed_date` in the `todos` table:
  - `handleAddTask`: Fixed `due_date` to use `Date.UTC` for the start of the current JST day (e.g., 2025-06-02 00:00 JST → `2025-06-01 15:00:00+00`). Previously, it incorrectly set `due_date` to `2025-06-01 06:00:00+00`.
  - `handleToggle`: Refined `completed_date` calculation to ensure precise JST-to-UTC conversion (e.g., 2025-06-02 04:38 JST → `2025-06-01 19:38:00+00`).
  - Ensured tasks added and completed at 2025-06-02 04:36 JST have correct UTC dates in the database and display as 2025-06-02 in the UI. (#ISSUE_NUMBER)
### Notes
- This fix resolves incorrect date handling for `due_date` and `completed_date`, ensuring alignment with JST (e.g., `due_date` should be `2025-06-01 15:00:00+00` for 2025-06-02 tasks).
- Developers should verify that tasks added at 2025-06-02 04:36 JST have `date` ≈ `2025-06-01 19:36:00+00`, `due_date` = `2025-06-01 15:00:00+00`, and `completed_date` ≈ `2025-06-01 19:38:00+00` in the database, with UI display as 2025-06-02.
- No database schema changes were required.

## 2025-06-0４ 

### Added
- Implemented "学び検索" (Learning Search) feature on the home page with a new button above "学びセッション".
- Created `/learning-search` page for searching questions by author, book, chapter, category, and free-text search.
- Added pagination to display up to 10 questions per page with a "もっと見る" (Load More) button.
- Fetched distinct filter options (authors, books, chapters, categories) from the `questions` table for dropdowns using client-side deduplication.
- Added vector-based search using the `match_questions` function with a UI toggle for semantic search, displaying additional fields (`learning`, `quote`, `similarity`).
- Added "Back to Home" button to `learning-search` page.
- Implemented dynamic filtering in `learning-search` to limit book, chapter, and category options based on selected author, book, and chapter.

### Removed
- Removed the goal display section from the home page.
- Removed the "やりたいことを選んでください" text from the home page.
- Removed the "ポイント" (Points) button from the home page navigation.

### Changed
- Reordered navigation items to place "学び検索" above "学びセッション".
- Simplified home page logic by removing unused goal-related state and queries.
- Replaced server-side `distinct` queries with client-side deduplication in `/learning-search` to resolve TypeScript errors.
- Updated `match_questions` function to use `plpgsql`, include additional columns (`learning`, `quote`, `category`, `book`, `chapter`), and support `match_count` parameter.
- Changed `match_questions` to use `extensions.vector` instead of `public.vector` to match `pgvector` schema.
- Updated `match_questions` to include `extensions` in `search_path` to resolve operator access.
- Modified `match_questions` to use dynamic SQL with `EXECUTE` to fix operator resolution in `PL/pgSQL`.
- Updated `learning-search` page UI with compact layout, smaller fonts, and dark mode support.
- Adjusted `match_questions` to cast `id` to `text` to match return type.
- Increased vector search `threshold` to `0.8` in `learning-search` for stricter similarity.
- Memoized `fetchFilterOptions` and `fetchQuestions` with `useCallback` to address `useEffect` dependency warnings.
- Sourced author options in `learning-search` from `src/data/philosophers` instead of database query.
- Corrected import path from `@/data/philosopher` to `@/data/philosophers`.
- Unified "Back to Home" button styling with `FaArrowLeft` (`text-gray-600 hover:text-gray-800`, `size={24}`).
- Updated `learning-search` to sort questions by `id` ascending.
- Enhanced chapter filtering in `learning-search` to restrict chapters to the selected book.
- Enhanced category filtering in `learning-search` to restrict categories to the selected author, book, and chapter.
- Aligned `learning-search` screen width with home page (`max-w-2xl`).

### Fixed
- Resolved TS2304 error in `learning-search` by correcting `mappedData` to `data` in keyword search block.
- Fixed infinite spinning of "もっと見る" button by adding `isFetchingRef` guard, total count check, and debouncing `handleLoadMore`.
- Fixed chapter filtering to only show chapters from the selected book.
- Fixed category filtering to only show categories from the selected author, book, and chapter.

### Security
- Secured the `match_questions` function by explicitly setting `search_path` to prevent schema manipulation vulnerabilities.

### Fixed
- **app/layout.tsx**: Ensured `TimezoneProvider` wraps all pages in the root layout to provide timezone context, fixing prerendering error for `/settings` page (`useTimezone must be used within a TimezoneProvider`). (#ISSUE_NUMBER)
- **settings/page.tsx**: Added `export const dynamic = "force-dynamic"` to disable static prerendering, as the page requires authentication and dynamic timezone context. (#ISSUE_NUMBER)

### Notes
- This fix resolves the Next.js prerendering error during `npm run build` for the `/settings` page.
- Developers should verify that:
  - `npm run build` completes successfully.
  - The `/settings` page loads correctly, allows timezone selection, and saves to the `profiles` table.
  - Tasks added at, e.g., 2025-06-04 22:29 JST have `due_date` = `2025-06-04 15:00:00+00` in Supabase and display as “2025-06-05” in the UI.
- No database schema changes were required.
- If other pages encounter similar prerendering issues, check for missing context providers or consider dynamic rendering.

### Fixed
- **TodoListPage**: Updated `date-fns-tz` imports to fix TypeScript errors:
  - Replaced `utcToZonedTime` with `toZonedTime` per `date-fns-tz@3.x.x` API.
  - Removed `zonedTimeToUtc`, using `Date.UTC` for UTC conversions.
  - Ensured `due_date` and `date` are converted from UTC to user’s timezone (default: `Asia/Tokyo`) for display, and user input is converted to UTC for storage.
  - Fixed grouping and sorting to use `toZonedTime` and Japanese locale (`ja`). (#ISSUE_NUMBER)
- **RootLayout**: Removed duplicate `{children}` render outside `TimezoneProvider` to prevent rendering app content twice. (#ISSUE_NUMBER)

### Notes
- These fixes resolve TypeScript errors and ensure correct timezone handling in `TodoListPage`.
- `RootLayout` now renders content once, improving performance and preventing duplicate UI elements.
- Developers should verify that tasks added at 2025-06-04 22:39 JST have `due_date` = `2025-06-04 15:00:00+00` and display as “2025-06-04” in `Asia/Tokyo`.
- Test with other timezones (e.g., `America/New_York`) to ensure correct date conversions.
- No database schema changes were required.

### Fixed
- **DiaryListPage**: Added TypeScript types for Supabase query responses and fixed `WorkLog` interface (`id` changed from `number` to `string` for UUID). Added dynamic timezone support with `date-fns-tz` and `TimezoneContext`. Introduced `isLoading` state for better UX. (#ISSUE_NUMBER)
- **CompletedTodoPage**: Added TypeScript types for Supabase queries (`todos`, `work_logs`). Replaced hard-coded JST `+9` offset with `date-fns-tz` for dynamic timezone display. Added `isLoading` state. (#ISSUE_NUMBER)
- **SchedulePage**: Added TypeScript types for `time_sessions` query. Replaced JST `–9` offset with `date-fns-tz` for dynamic timezone handling. Added `isLoading` state. (#ISSUE_NUMBER)
- **TimeTrackerPage**: Added TypeScript types for `todos` and `time_sessions` queries. Replaced JST `–9` offset in `fetchTodos` with `date-fns-tz` for dynamic timezone filtering. Added `isLoading` state. (#ISSUE_NUMBER)

### Added
- **Timezone Support**: Extended all pages to use `TimezoneContext` and `date-fns-tz` for dynamic timezone handling, ensuring dates are stored in UTC and displayed in the user’s timezone (default: `Asia/Tokyo`). (#ISSUE_NUMBER)
- **Loading States**: Added `isLoading` states to all pages for consistent UX, showing “読み込み中...” during Supabase fetches. (#ISSUE_NUMBER)

### Notes
- These changes align all pages with the TypeScript and timezone fixes applied to `TodoListPage`, ensuring consistency across the app.
- Developers should test task and log operations at 2025-06-05 00:03 JST to verify:
  - Database: Dates stored as UTC (e.g., `due_date` = `2025-06-04 15:00:00+00` for 2025-06-05 00:00 JST).
  - UI: Dates displayed in user’s timezone (e.g., “2025-06-05” in `Asia/Tokyo`).
  - Supabase queries execute without TypeScript errors.
- Test with other timezones (e.g., `America/New_York`) and DST transitions.
- No database schema changes were required, but verify `work_logs.id` is `UUID`, not `integer`.
- Run `npm run build` to ensure no TypeScript errors.

### Fixed
- **DiaryListPage**: Removed unused `formatDate` function to fix ESLint `@typescript-eslint/no-unused-vars` error, allowing successful `next build`. Also removed unused `formatInTimeZone`, `toZonedTime`, and `ja` imports since no timezone formatting is needed. (#ISSUE_NUMBER)
- **TimeTrackerPage**: Removed unused `formatInTimeZone` and `ja` imports to fix ESLint `@typescript-eslint/no-unused-vars` errors, ensuring successful `next build`. (#ISSUE_NUMBER)

### Notes
- These changes resolve ESLint errors that prevented `npm run build` from completing.
- No functional changes were made; all Supabase queries and timezone logic remain intact.
- Developers should run `npm run build` to confirm no remaining ESLint errors.
- Test app functionality at 2025-06-05 00:12 JST to verify:
  - Diary logs display correctly for selected date.
  - Time tracking works without errors, with tasks filtered by due date in user’s timezone.
- No database schema changes were required.

### Fixed
- **SettingsPage**: Restored original functionality (user info, goal management, logout, delete user, FAQ, privacy policy, terms of service) after accidental overwrite with timezone-only settings. Integrated timezone settings into the "User Information" tab, using `TimezoneContext` and `profiles` table. Fixed bug in `handleUpdateEmailPassword` where password input `onChange` incorrectly updated `newEmail` instead of `newPassword`. (#ISSUE_NUMBER)

### Added
- **Timezone Settings in SettingsPage**: Added timezone selection dropdown and modal, allowing users to update their timezone in the `profiles` table. Timezone is fetched on load and synced with `TimezoneContext`. (#ISSUE_NUMBER)
- **Profile Cleanup**: Added deletion of `profiles` table entry in `handleDeleteUser` to ensure complete user data removal. (#ISSUE_NUMBER)

### Notes
- This change restores critical `SettingsPage` features while adding timezone support, ensuring compatibility with the app’s dynamic timezone handling.
- Developers should test all settings features at 2025-06-05 12:27 JST:
  - Verify username, email, password, and goal updates work correctly.
  - Confirm timezone selection updates `profiles.timezone` and affects date displays in other pages (e.g., `TodoListPage`, `SchedulePage`).
  - Ensure logout and delete user functions operate without errors.
  - Check FAQ and policy links navigate correctly.
- Run `npm run build` to confirm no ESLint/TypeScript errors.
- No database schema changes were required, but ensure `profiles` table exists with `timezone` column.

### Fixed
- **SettingsPage**: Updated to work with RLS-enabled `profiles` table, addressing Supabase linter error (`rls_disabled_in_public`). Modified `fetchUserData` and `handleUpdateTimezone` to use RLS-compatible queries with `user_id = auth.uid()`. Changed `handleUpdateTimezone` to `upsert` for profile creation. Enhanced error handling for RLS denials. (#ISSUE_NUMBER)

### Added
- **RLS on Profiles Table**: Enabled Row Level Security (RLS) on `public.profiles` table with policies for `SELECT`, `UPDATE`, `INSERT`, and `DELETE`, restricting access to authenticated users’ own rows (`user_id = auth.uid()`). Updated permissions to revoke `anon` and `public` access. (#ISSUE_NUMBER)

### Notes
- This change resolves the critical security issue where `profiles` was publicly accessible without RLS, ensuring user data (e.g., `timezone`) is protected.
- Developers should test `SettingsPage` at 2025-06-05 00:46 JST:
  - Verify timezone updates save to `profiles.timezone` and sync with `TimezoneContext`.
  - Confirm other settings (username, email, password, goal) and user actions (logout, delete) work correctly.
  - Test unauthenticated access to `profiles` via PostgREST to ensure RLS denies access.
- Run `npm run build` to confirm no ESLint/TypeScript errors.
- Ensure `profiles` table schema includes `timezone` (`text`) and `user_id` (`UUID`) with RLS enabled.
- Apply similar RLS checks to other public tables (e.g., `todos`, `work_logs`) if exposed via PostgREST.

## 2025-06-05
### Changed
- TodoListPage: Adjusted task item layout to display task text and priority buttons in a single row using flex - - - items-center justify-between, removing the mt-2 margin and combining elements into one div.
- TodoListPage: Removed due date display from task list items as it’s redundant with due date grouping.
- TodoListPage: Modified handleAddTask to reload todos from Supabase after adding a new task to ensure correct display order.
- TodoListPage: Updated layout to match LearningSearch component, including dark mode support, Tailwind CSS classes for inputs, buttons, and cards, and consistent typography.
### Fixed
- TodoListPage: Resolved ESLint warning for missing fetchTodos dependency in useEffect by wrapping fetchTodos in useCallback and adding it to the dependency array.

### Changed
- **UI Consistency**: Updated `app/todo/completed/page.tsx` to align with `LearningSearch` layout, including dark mode support, standardized container (`p-6 max-w-2xl mx-auto`), header, buttons, and list item styles (`bg-gray-100 dark:bg-gray-800`). Adjusted typography and colors for dark mode compatibility.
- **UI Consistency**: Updated `app/time-tracker/page.tsx` to match `LearningSearch` styling, including container, header, inputs (`bg-gray-50 dark:bg-gray-800`), buttons (`bg-blue-500 dark:bg-blue-600`), and list items. Ensured dark mode support for all elements.
- **UI Consistency**: Updated `app/page.tsx` to adopt `LearningSearch` layout, standardizing container, header with centered logo, and navigation buttons (`bg-gray-100 dark:bg-gray-800`). Adjusted error/loading states for dark mode.
- **UI Consistency**: Updated `app/schedule/page.tsx` to align with `LearningSearch`, including container, header, inputs, and list items. Added dark mode support for pie chart legend and standardized typography.
- **UI Consistency**: Updated `app/diary/list/page.tsx` to align with `LearningSearch` layout, retaining table-based display. Added dark mode support (`bg-gray-900`, `text-gray-100`), standardized typography (`text-sm`), and styled table (`bg-gray-100 dark:bg-gray-800`). Added print-friendly CSS, buttons for printing, copying formatted text for Slack/email, and CSV export functionality.
- **UI Consistency**: Updated `app/learning-session/page.tsx` to match `LearningSearch` styling, including container, header, select inputs (`bg-gray-50 dark:bg-gray-800`), buttons (`bg-blue-500 dark:bg-blue-600`), and chat bubbles (`bg-gray-100 dark:bg-gray-800`). Ensured modals and error/loading states support dark mode.
- **UI Consistency**: Updated `app/login/page.tsx` to align with `LearningSearch`, standardizing container, header, inputs (`bg-gray-50 dark:bg-gray-800`), and buttons (`bg-blue-500 dark:bg-blue-600`). Adjusted error/success messages for dark mode (`text-red-500 dark:text-red-400`, `text-green-500 dark:text-green-400`).
- **UI Consistency**: Updated `app/settings/page.tsx` to align with `LearningSearch` layout, including dark mode support (`bg-gray-900`, `text-gray-100`), standardized container, header with `FaArrowLeft` and `FaBars`, tab navigation, inputs (`bg-gray-50 dark:bg-gray-800`), buttons (`bg-blue-500 dark:bg-blue-600`), and modals (`bg-white dark:bg-gray-900`). Adjusted typography and error/success messages for dark mode.
- **UI Consistency**: Updated `app/privacy-policy/page.tsx` to match `LearningSearch` styling, including container, header with `FaArrowLeft`, and content sections (`bg-gray-100 dark:bg-gray-800`). Ensured dark mode text colors (`text-gray-300`, `text-blue-400` for links) and consistent typography (`text-sm`, `text-base`).
- **UI Consistency**: Updated `app/terms-of-service/page.tsx` to align with `LearningSearch`, standardizing container, header with `FaArrowLeft`, and content sections (`bg-gray-100 dark:bg-gray-800`). Adjusted text colors (`text-gray-300`, `text-blue-400`) and typography for dark mode compatibility.

### Changed
- **TodoListPage**: Restored preferred layout from previous version, reverting Tailwind classes (e.g., `max-w-2xl`, `mb-4`, `p-2`, `bg-gray-100` for task cards, `p-4` for modal) to match desired styling while preserving functional improvements.
- **TodoListPage**: Updated task group date format to `yyyy年M月d日 (EEE)` for Japanese-friendly display.
- **TodoListPage**: Reverted UI text to Japanese (e.g., "タスクリスト", "タスクを追加...", "タスク詳細") to complete the Japanese version.
- **TodoListPage**: Removed priority arrows and number from task rows to simplify UI on small screens.
- **TodoListPage**: Enhanced task detail modal to include editable task text, priority adjustment via number input, a button to start time tracking, and a delete button.
- **TodoListPage**: Adjusted task item layout to display task text and checkbox in a single row using `flex items-center justify-between`.
- **TodoListPage**: Removed due date display from task list items as it’s redundant with due date grouping.
- **TodoListPage**: Modified `handleAddTask` to reload todos from Supabase after adding a new task to ensure correct display order.
- **TodoListPage**: Updated layout to match `LearningSearch` component, including dark mode support and consistent typography.

### Fixed
- **TodoListPage**: Resolved ESLint warning for missing `fetchTodos` dependency in `useEffect` by wrapping `fetchTodos` in `useCallback` and adding it to the dependency array.
- **TodoListPage**: Fixed TypeScript errors in `savePoints` function by correcting destructuring syntax for `supabase.auth.getUser()` and adding type annotations for `user` (`User | null`) and `userError` (`AuthError | null`).
- **TodoListPage**: Fixed TypeScript error by replacing `subscription.detach()` with `subscription.unsubscribe()` in the `useEffect` cleanup for the Supabase auth state change listener.

### Added
- **TodoListPage**: Implemented `startTimeTracking` function to insert records into a `time_tracking` Supabase table when the “時間計測を開始” button is clicked in the task detail modal.
- **TodoListPage**: Added a delete button to the task detail modal, reusing the `handleDelete` function for consistency with swipe-to-delete.

### Changed
- Set explicit `search_path = public, auth` for `public.create_profile_for_new_user` function to resolve Supabase linter warning `function_search_path_mutable`. Secures trigger on `auth.users` for creating profiles in `public.profiles` with `Asia/Tokyo` timezone. 
- Set explicit `search_path = public` for `public.update_updated_at_column` function to resolve Supabase linter warning `function_search_path_mutable`. Enhances security by preventing schema manipulation for timestamp updates. 
### Changed
- Optimized RLS policies on `public.work_logs`, `public.time_sessions`, and `public.profiles` by replacing `auth.uid()` with `(SELECT auth.uid())`, resolving Supabase linter warning `auth_rls_initplan`. Changed `work_logs` policies to `authenticated` role for security. 
- Consolidated `SELECT` policies on `public.questions` into `questions_read_access` for `authenticated` role, resolving Supabase linter warning `multiple_permissive_policies`. 
- Dropped duplicate index `questions_embedding_idx` on `public.questions`, keeping `idx_questions_embedding`, resolving Supabase linter warning `duplicate_index`. 

### Fixed
- **User Deletion Error**: Fixed issue where deleting a user caused `Invalid Refresh Token` and other API errors (HTTP 400, 403, 406). Modified `handleDeleteUser` to explicitly sign out and clear Supabase client state before redirecting to `/login`. Optimized `useEffect` to prevent unnecessary API calls after user deletion. Added error boundary to handle unexpected errors gracefully. 

### Added
- **Error Boundary**: Added `ErrorBoundary` component to catch and display unhandled errors in the Settings page, improving user experience. 

### Fixed
- **User Deletion TypeScript Error**: Resolved TypeScript error in `handleDeleteUser` where `supabase.auth.setSession(null)` caused a type mismatch. Removed `setSession` call and relied on `supabase.auth.signOut()` to invalidate the session, ensuring proper cleanup and redirect. 
### Fixed
- **Settings Page TypeScript Errors**: Resolved syntax error in `showPasswordModal` state declaration causing multiple TypeScript errors (Codes 2448, 2347, 7022, 1005, 1134, 7005). Corrected `useState` declarations with explicit type annotations and fixed import issues to ensure proper type inference. 
### Fixed
- **User Deletion 403 Error**: Moved user deletion logic from client-side `supabase.auth.admin.deleteUser` to a server-side API route (`/api/users/delete`) using the `service_role` key to resolve 403 Forbidden errors. Updated `handleDeleteUser` to call the new API route and ensure proper session cleanup. 
- **406 Not Acceptable Error**: Added error handling for `406` errors in `fetchUserData` when querying the `profiles` table, setting default timezone if query fails. Ensured proper RLS policies for `profiles` table. 
(#ISSUE_NUMBER:8ccc3c8 (HEAD -> fix/delete_user_error, origin/fix/delete_user_error) delete user error resolved.)

## 2025-06-11
### Fixed
- **User Registration 500 Error**: Resolved `Database error saving new user` by granting `USAGE` on the `public` schema and `INSERT` on `profiles` and `user_settings` tables to the `authenticator` role. Verified `create_profile_for_new_user` trigger setup. Removed redundant `pages/api/users/register.ts` and enhanced error handling in `app/login/page.tsx`. 
(#ISSUE_NUMBER)

### Fixed
- **Registration Session Error**: Resolved セッションの取得に失敗しました error during user registration by removing unnecessary supabase.auth.getSession() call in handleRegister when email confirmation is enabled. Updated app/login/page.tsx to inform users to verify their email and added loading state for better UX. (#ISSUE_NUMBER)

### Fixed
- **Registration RLS Error**: Resolved `401 Unauthorized` and `42501` errors during `user_settings` insertion by moving it to a server-side API route (`/api/users/register`) using the `service_role` key. Updated RLS policies for `user_settings` and `user_session_metadata` to allow `authenticator` inserts and selects. (#ISSUE_NUMBER)
- **Deletion Sign-Out Error**: Handled `403 Forbidden` error during `signOut` in `handleDeleteUser` by ignoring failures when no session exists. (#ISSUE_NUMBER)
- **User Session Metadata 406 Error**: Added handling for `406 Not Acceptable` errors in `fetchUserData` for `user_session_metadata` queries, setting default values on failure. (#ISSUE_NUMBER)
- **Settings Page 406 Error**: Resolved 406 Not Acceptable error when querying user_session_metadata by correcting RLS policy syntax to use USING instead of WITH CHECK for SELECT. Added initial user_session_metadata row creation in /api/users/register.ts and updated fetchUserData to use maybeSingle for robust handling of missing rows. (#ISSUE_NUMBER)

## 2025-06-12
### Fixed
- **Production User Deletion 405 Error**: Resolved 405 Method Not Allowed error for /api/users/delete in production by adding the missing SUPABASE_SERVICE_ROLE_KEY to Vercel’s environment variables for all environments. Redeployed the application to ensure the API route functions correctly. (#239dc28)

## 2025-06-17

### Fixed
- **User Deletion Success Message**: Fixed missing success message by refactoring `handleDeleteUser` in `app/settings/page.tsx` to use state-driven UI for displaying “ユーザーデータが削除されました” before redirecting. Removed redundant `supabase.auth.signOut()` call to avoid `403 Forbidden` errors. Silenced `Auth session missing` errors in `app/login/page.tsx` and enhanced logging in `/api/users/delete`. (#ISSUE_NUMBER)
