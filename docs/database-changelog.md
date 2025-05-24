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

