-- WordsApp CEFR Levels Migration
-- Run this in Supabase SQL Editor

ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
