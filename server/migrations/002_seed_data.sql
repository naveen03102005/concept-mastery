-- ============================================================
-- Seed: Demo data for Academic Mastery Portal
-- Run AFTER migration 001_create_schema.sql
-- ============================================================

-- ============================================================
-- STAFF (passwords stored plain-text to match existing auth)
-- ============================================================
INSERT INTO staff (id, email, password, name, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'teacher@school.edu',  'teacher123',  'Ms. Sarah Johnson',  'teacher'),
  ('11111111-0000-0000-0000-000000000002', 'admin@school.edu',    'admin123',    'Mr. David Clark',    'admin'),
  ('11111111-0000-0000-0000-000000000003', 'science@school.edu',  'science123',  'Dr. Priya Sharma',   'teacher')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- STUDENTS
-- ============================================================
INSERT INTO students (id, email, password, name, grade) VALUES
  ('22222222-0000-0000-0000-000000000001', 'alice@student.edu',   'alice123',   'Alice Thompson',  '10-A'),
  ('22222222-0000-0000-0000-000000000002', 'bob@student.edu',     'bob123',     'Bob Martinez',    '10-B'),
  ('22222222-0000-0000-0000-000000000003', 'carol@student.edu',   'carol123',   'Carol Nguyen',    '11-A'),
  ('22222222-0000-0000-0000-000000000004', 'david@student.edu',   'david123',   'David Kim',       '11-B'),
  ('22222222-0000-0000-0000-000000000005', 'emma@student.edu',    'emma123',    'Emma Patel',      '10-A')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- CONCEPTS
-- ============================================================
INSERT INTO concepts (id, name, subject, description, created_by) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Linear Equations',         'Mathematics', 'Solving and graphing linear equations',           '11111111-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000002', 'Quadratic Functions',      'Mathematics', 'Factoring, vertex form, and graphing parabolas',  '11111111-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000003', 'Cell Division (Mitosis)',   'Biology',     'Phases of mitosis and cell reproduction',         '11111111-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000004', 'Atomic Structure',         'Chemistry',   'Electron configuration and periodic table trends','11111111-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000005', 'Shakespeare Analysis',     'Literature',  'Analytical reading of Shakespearean plays',       '11111111-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000006', 'Motion & Forces',          'Physics',     'Newton laws, velocity, and acceleration',         '11111111-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TASKS
-- ============================================================
INSERT INTO tasks (
  id, title, concept, description, due_date, status, priority, assigned_to, created_by
) VALUES
  (
    '44444444-0000-0000-0000-000000000001',
    'Algebra Quiz – Linear Functions',
    'Linear Equations',
    'Solve the given 10 linear equations and show all working steps. Graph at least 3 equations on a coordinate plane.',
    NOW() + INTERVAL '7 days',
    'pending', 'high',
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001'
  ),
  (
    '44444444-0000-0000-0000-000000000002',
    'Quadratic Functions Worksheet',
    'Quadratic Functions',
    'Complete all 15 problems on factoring and identifying vertex form. Include worked solutions.',
    NOW() + INTERVAL '10 days',
    'pending', 'medium',
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001'
  ),
  (
    '44444444-0000-0000-0000-000000000003',
    'Mitosis Phases Diagram',
    'Cell Division (Mitosis)',
    'Draw and label all phases of mitosis. Include a brief description (2–3 sentences) for each phase.',
    NOW() + INTERVAL '5 days',
    'submitted', 'medium',
    '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000003'
  ),
  (
    '44444444-0000-0000-0000-000000000004',
    'Atomic Structure Essay',
    'Atomic Structure',
    'Write a 500-word essay explaining electron configuration and how periodic table trends relate to atomic structure.',
    NOW() - INTERVAL '2 days',
    'completed', 'high',
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000003'
  ),
  (
    '44444444-0000-0000-0000-000000000005',
    'Shakespeare Sonnet Analysis',
    'Shakespeare Analysis',
    'Analyse Sonnet 18 ("Shall I compare thee to a summer''s day?"). Discuss themes, literary devices, and meter.',
    NOW() + INTERVAL '14 days',
    'pending', 'low',
    NULL,
    '11111111-0000-0000-0000-000000000001'
  ),
  (
    '44444444-0000-0000-0000-000000000006',
    'Newton''s Laws Lab Report',
    'Motion & Forces',
    'Write a lab report (introduction, method, results, conclusion) for the cart-and-ramp experiment conducted in class.',
    NOW() + INTERVAL '3 days',
    'in-progress', 'high',
    '22222222-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000003'
  )
ON CONFLICT DO NOTHING;

-- Update the submitted task with a response
UPDATE tasks
SET
  response_text = 'I have completed the diagram showing all 5 phases: Prophase, Metaphase, Anaphase, Telophase, and Cytokinesis. Each phase is labeled with key events.',
  submitted_at  = NOW() - INTERVAL '1 day'
WHERE id = '44444444-0000-0000-0000-000000000003';

-- Update the completed task with approval info
UPDATE tasks
SET
  response_text = 'Electrons fill orbitals in order of increasing energy (Aufbau principle). The periodic trends such as ionization energy and electronegativity relate directly to the number of protons and electron shielding.',
  submitted_at  = NOW() - INTERVAL '5 days',
  approved_at   = NOW() - INTERVAL '3 days',
  approved_by   = '11111111-0000-0000-0000-000000000003'
WHERE id = '44444444-0000-0000-0000-000000000004';

-- ============================================================
-- MASTERY
-- ============================================================
INSERT INTO mastery (student_id, concept_id, mastery_level, notes) VALUES
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 95, 'Excellent – consistent high scores on all quizzes'),
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 92, 'Very strong understanding of quadratics'),
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 58, 'Needs to review electron configuration'),
  ('22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 78, 'Good foundation, needs more practice on graphing'),
  ('22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 65, 'Working on vertex form'),
  ('22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 85, 'Good grasp of all phases'),
  ('22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000005', 72, 'Developing analytical skills'),
  ('22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000006', 52, 'Foundation building in progress'),
  ('22222222-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 88, 'Strong algebra skills'),
  ('22222222-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000005', 80, 'Good literary analysis')
ON CONFLICT (student_id, concept_id) DO UPDATE
  SET mastery_level = EXCLUDED.mastery_level,
      notes         = EXCLUDED.notes,
      last_assessed = NOW();
