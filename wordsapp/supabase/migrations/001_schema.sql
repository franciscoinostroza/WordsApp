-- WordsApp Database Schema (Idempotent)
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  definition TEXT,
  example TEXT,
  ipa TEXT,
  part_of_speech TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table (SM-2 spaced repetition)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interval INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  last_quality INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flashcard_id, user_id)
);

-- Quiz sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  duration_sec INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  linked_word TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress stats
CREATE TABLE IF NOT EXISTS progress_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_studied INTEGER DEFAULT 0,
  words_learned INTEGER DEFAULT 0,
  quiz_score_avg FLOAT,
  minutes_studied INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_flashcard_id ON reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id_due ON reviews(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_progress_user_date ON progress_stats(user_id, date);

-- RLS Policies (safe to run multiple times)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_stats ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own row
CREATE POLICY IF NOT EXISTS "Users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users update own" ON users FOR UPDATE USING (auth.uid() = id);

-- Decks policies
CREATE POLICY IF NOT EXISTS "Decks CRUD own" ON decks
  FOR ALL USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY IF NOT EXISTS "Flashcards CRUD own" ON flashcards
  FOR ALL USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY IF NOT EXISTS "Reviews CRUD own" ON reviews
  FOR ALL USING (auth.uid() = user_id);

-- Quiz sessions policies
CREATE POLICY IF NOT EXISTS "Quiz sessions read own" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Quiz sessions insert own" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY IF NOT EXISTS "Chat messages CRUD own" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- Progress stats policies
CREATE POLICY IF NOT EXISTS "Progress stats CRUD own" ON progress_stats
  FOR ALL USING (auth.uid() = user_id);
