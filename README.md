# NBRCD

NBRCD is a web application that helps users form actionable habits through sessions inspired by business philosophies (e.g., Drucker, Matsushita, Inamori). Users engage in guided conversations, receive action plans, and save tasks to a todo list.

## Features
- **Concise Mode** (`/`): Generates a summary and action plan (`1. [Action], 2. [Action], 3. [Action]`) after three user inputs, with "まとめ" appended internally (hidden from UI).
- **Consulting Session** (`/consulting-session`): Supports `concise`, `conversational`, and `detailed` modes, with mode selection disabled after the first message.
- **Todo List** (`/todo/list`): Displays tasks saved from action plans, grouped by date, with completion and deletion functionality.

## Tech Stack
- **Frontend**: Next.js 15.3.2, TypeScript, React
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: React Icons

## Prerequisites
- Node.js (v18 or higher)
- Supabase account and project
- `.env.local` with Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

## Setup
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd nbrcd
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Supabase**:
   - Create a Supabase project and note the URL and anon key.
   - Set up tables: `todos`, `user_session_metadata`, `prompts`, `questions`, `user_settings`, `point_logs`, `sessions`.
   - Configure Row-Level Security (RLS) policies:
     ```sql
     CREATE POLICY insert_todos ON public.todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
     CREATE POLICY select_todos ON public.todos FOR SELECT TO authenticated USING (auth.uid() = user_id);
     ```
   - Add prompts to `prompts` table:
     - ID 1: Consulting `concise`
     - ID 2: Consulting `conversational`
     - ID 3: Consulting `detailed`
     - ID 4: Home `concise`

4. **Run Locally**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## Build and Deploy
- **Build**:
  ```bash
  npm run build
  ```
- **Start**:
  ```bash
  npm run start
  ```
- Deploy to Vercel or another platform, ensuring `.env` variables are set.

## Usage
1. **Home (`/`)**:
   - Select a philosopher (e.g., Drucker).
   - Input three queries to receive a summary and action plan.
   - Select an action to save it as a task in `/todo/list`.
2. **Consulting Session (`/consulting-session`)**:
   - Choose a mode before sending the first message (`concise`, `conversational`, `detailed`).
   - Mode locks after the first message.
   - Input queries to receive responses tailored to the mode.
3. **Todo List (`/todo/list`)**:
   - View, complete, or delete tasks grouped by date.

## Troubleshooting
- **Supabase Errors**: Verify RLS policies and table schemas.
- **Build Errors**: Ensure ESLint rules are satisfied (`npm run build`).
- **Mode Issues**: Check prompt IDs in `prompts` table and `promptIdMap` in `app/consulting-session/page.tsx`.

## Contributing
- Fork the repository.
- Create a feature branch (`git checkout -b feature/xyz`).
- Commit changes (`git commit -m "Add xyz feature"`).
- Push and create a pull request.

## License
MIT License