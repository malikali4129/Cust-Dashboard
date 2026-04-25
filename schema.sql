-- Supabase Database Schema for University Dashboard
-- Run this in Supabase SQL Editor to create tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deadlines table
CREATE TABLE IF NOT EXISTS deadlines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    date TIMESTAMPTZ NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    date TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL,
    total_marks INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (for admin password)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    admin_password TEXT DEFAULT 'cr2024',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (id, admin_password, last_updated)
VALUES (1, 'cr2024', NOW())
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) but allow all access for this use case
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (suitable for class dashboard)
CREATE POLICY "Allow all" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON deadlines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(date DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline ASC);
CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(date ASC);
CREATE INDEX IF NOT EXISTS idx_quizzes_date ON quizzes(date ASC);
