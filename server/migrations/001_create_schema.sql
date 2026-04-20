-- ============================================================
-- Migration 001: Create Schema for Academic Mastery Portal
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: staff
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  grade       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: concepts
-- ============================================================
CREATE TABLE IF NOT EXISTS concepts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: mastery
-- ============================================================
CREATE TABLE IF NOT EXISTS mastery (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  concept_id    UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  last_assessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  UNIQUE (student_id, concept_id)
);

-- ============================================================
-- TABLE: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  concept         TEXT,
  description     TEXT,
  due_date        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in-progress', 'completed')),
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to     UUID REFERENCES students(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  response_text   TEXT,
  response_image  TEXT,
  feedback        TEXT,
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  rejected_at     TIMESTAMPTZ,
  rejected_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_created_by    ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_mastery_student_id  ON mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_concept_id  ON mastery(concept_id);

-- ============================================================
-- Row Level Security (RLS) — DISABLED for service-role key
-- The Express backend uses the service_role key which bypasses RLS.
-- This keeps the existing auth pattern (email+password in our tables).
-- ============================================================
-- RLS is OFF by default; if you want to enable later, uncomment:
-- ALTER TABLE staff    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mastery  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTION: auto-update updated_at on tasks
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
