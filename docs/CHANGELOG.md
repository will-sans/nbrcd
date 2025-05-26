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

