/**
 * migrate.js — Full migration: DDL via Supabase Management API (PAT),
 *              then seed data via supabase-js client.
 * Usage: node migrate.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAT           = process.env.SUPABASE_PAT;
const PROJECT_REF   = new URL(SUPABASE_URL).hostname.split('.')[0];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Run DDL via Management API (needs PAT) ────────────────────
async function execSQL(label, sql) {
  process.stdout.write(`   🔄  ${label} ... `);
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PAT}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message || body?.error || JSON.stringify(body);
    if (msg.toLowerCase().includes('already exists')) {
      console.log('✅  (already exists)');
      return true;
    }
    console.log(`❌  HTTP ${res.status}: ${msg}`);
    return false;
  }
  console.log('✅');
  return true;
}

// ── Schema DDL ────────────────────────────────────────────────
async function runSchema() {
  console.log('\n📋  Phase 1 — Schema (DDL via Management API)');

  const steps = [
    ['UUID extension',
     `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`],

    ['Table: staff',
     `CREATE TABLE IF NOT EXISTS staff (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email      TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        name       TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher','admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`],

    ['Table: students',
     `CREATE TABLE IF NOT EXISTS students (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email      TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        name       TEXT NOT NULL,
        grade      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`],

    ['Table: concepts',
     `CREATE TABLE IF NOT EXISTS concepts (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        TEXT NOT NULL,
        subject     TEXT NOT NULL,
        description TEXT,
        created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`],

    ['Table: mastery',
     `CREATE TABLE IF NOT EXISTS mastery (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        concept_id    UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
        last_assessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes         TEXT,
        UNIQUE (student_id, concept_id)
      )`],

    ['Table: tasks',
     `CREATE TABLE IF NOT EXISTS tasks (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title          TEXT NOT NULL,
        concept        TEXT,
        description    TEXT,
        due_date       TIMESTAMPTZ,
        status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','in-progress','completed')),
        priority       TEXT NOT NULL DEFAULT 'medium'  CHECK (priority IN ('low','medium','high')),
        assigned_to    UUID REFERENCES students(id) ON DELETE SET NULL,
        created_by     UUID REFERENCES staff(id)    ON DELETE SET NULL,
        response_text  TEXT,
        response_image TEXT,
        feedback       TEXT,
        submitted_at   TIMESTAMPTZ,
        approved_at    TIMESTAMPTZ,
        approved_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
        rejected_at    TIMESTAMPTZ,
        rejected_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`],

    ['Indexes',
     `CREATE INDEX IF NOT EXISTS idx_tasks_created_by   ON tasks(created_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to  ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_mastery_student_id ON mastery(student_id);
      CREATE INDEX IF NOT EXISTS idx_mastery_concept_id ON mastery(concept_id)`],

    ['Trigger: updated_at',
     `CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
      CREATE TRIGGER tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`],
  ];

  for (const [label, sql] of steps) {
    const ok = await execSQL(label, sql);
    if (!ok) return false;
  }
  return true;
}

// ── Seed via supabase-js (service_role, always works) ─────────
async function runSeed() {
  console.log('\n🌱  Phase 2 — Seed data (via supabase-js)');

  const now = new Date();
  const d   = (days) => new Date(now.getTime() + days * 86400000).toISOString();

  const steps = [
    ['staff', () => supabase.from('staff').upsert([
      { id:'11111111-0000-0000-0000-000000000001', email:'teacher@school.edu', password:'teacher123', name:'Ms. Sarah Johnson', role:'teacher' },
      { id:'11111111-0000-0000-0000-000000000002', email:'admin@school.edu',   password:'admin123',   name:'Mr. David Clark',   role:'admin'   },
      { id:'11111111-0000-0000-0000-000000000003', email:'science@school.edu', password:'science123', name:'Dr. Priya Sharma',  role:'teacher' },
    ], { onConflict:'email', ignoreDuplicates:true })],

    ['students', () => supabase.from('students').upsert([
      { id:'22222222-0000-0000-0000-000000000001', email:'alice@student.edu', password:'alice123', name:'Alice Thompson', grade:'10-A' },
      { id:'22222222-0000-0000-0000-000000000002', email:'bob@student.edu',   password:'bob123',   name:'Bob Martinez',   grade:'10-B' },
      { id:'22222222-0000-0000-0000-000000000003', email:'carol@student.edu', password:'carol123', name:'Carol Nguyen',   grade:'11-A' },
      { id:'22222222-0000-0000-0000-000000000004', email:'david@student.edu', password:'david123', name:'David Kim',      grade:'11-B' },
      { id:'22222222-0000-0000-0000-000000000005', email:'emma@student.edu',  password:'emma123',  name:'Emma Patel',     grade:'10-A' },
    ], { onConflict:'email', ignoreDuplicates:true })],

    ['concepts', () => supabase.from('concepts').upsert([
      { id:'33333333-0000-0000-0000-000000000001', name:'Linear Equations',       subject:'Mathematics', description:'Solving and graphing linear equations',           created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'33333333-0000-0000-0000-000000000002', name:'Quadratic Functions',    subject:'Mathematics', description:'Factoring, vertex form, and graphing parabolas',  created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'33333333-0000-0000-0000-000000000003', name:'Cell Division (Mitosis)',subject:'Biology',     description:'Phases of mitosis and cell reproduction',         created_by:'11111111-0000-0000-0000-000000000003' },
      { id:'33333333-0000-0000-0000-000000000004', name:'Atomic Structure',       subject:'Chemistry',   description:'Electron configuration and periodic table trends', created_by:'11111111-0000-0000-0000-000000000003' },
      { id:'33333333-0000-0000-0000-000000000005', name:'Shakespeare Analysis',   subject:'Literature',  description:'Analytical reading of Shakespearean plays',       created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'33333333-0000-0000-0000-000000000006', name:'Motion and Forces',      subject:'Physics',     description:'Newton laws, velocity, and acceleration',         created_by:'11111111-0000-0000-0000-000000000003' },
    ], { onConflict:'id', ignoreDuplicates:true })],

    ['tasks', () => supabase.from('tasks').upsert([
      { id:'44444444-0000-0000-0000-000000000001', title:'Algebra Quiz - Linear Functions',  concept:'Linear Equations',       description:'Solve the given 10 linear equations and show all working steps.',       due_date:d(7),   status:'pending',     priority:'high',   assigned_to:'22222222-0000-0000-0000-000000000001', created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'44444444-0000-0000-0000-000000000002', title:'Quadratic Functions Worksheet',    concept:'Quadratic Functions',    description:'Complete all 15 problems on factoring and identifying vertex form.',    due_date:d(10),  status:'pending',     priority:'medium', assigned_to:'22222222-0000-0000-0000-000000000002', created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'44444444-0000-0000-0000-000000000003', title:'Mitosis Phases Diagram',           concept:'Cell Division (Mitosis)',description:'Draw and label all phases of mitosis.',                                due_date:d(5),   status:'submitted',   priority:'medium', assigned_to:'22222222-0000-0000-0000-000000000003', created_by:'11111111-0000-0000-0000-000000000003', response_text:'I completed the diagram showing all 5 phases.', submitted_at:d(-1) },
      { id:'44444444-0000-0000-0000-000000000004', title:'Atomic Structure Essay',           concept:'Atomic Structure',       description:'Write a 500-word essay explaining electron configuration.',             due_date:d(-2),  status:'completed',   priority:'high',   assigned_to:'22222222-0000-0000-0000-000000000001', created_by:'11111111-0000-0000-0000-000000000003', response_text:'Electrons fill orbitals in order of increasing energy.', submitted_at:d(-5), approved_at:d(-3), approved_by:'11111111-0000-0000-0000-000000000003' },
      { id:'44444444-0000-0000-0000-000000000005', title:'Shakespeare Sonnet Analysis',      concept:'Shakespeare Analysis',   description:'Analyse Sonnet 18. Discuss themes, literary devices, and meter.',      due_date:d(14),  status:'pending',     priority:'low',    assigned_to:null,                                   created_by:'11111111-0000-0000-0000-000000000001' },
      { id:'44444444-0000-0000-0000-000000000006', title:'Newton Laws Lab Report',           concept:'Motion and Forces',      description:'Write a lab report for the cart-and-ramp experiment.',                 due_date:d(3),   status:'in-progress', priority:'high',   assigned_to:'22222222-0000-0000-0000-000000000004', created_by:'11111111-0000-0000-0000-000000000003' },
    ], { onConflict:'id', ignoreDuplicates:true })],

    ['mastery', () => supabase.from('mastery').upsert([
      { student_id:'22222222-0000-0000-0000-000000000001', concept_id:'33333333-0000-0000-0000-000000000001', mastery_level:95, notes:'Excellent – consistent high scores' },
      { student_id:'22222222-0000-0000-0000-000000000001', concept_id:'33333333-0000-0000-0000-000000000002', mastery_level:92, notes:'Very strong understanding of quadratics' },
      { student_id:'22222222-0000-0000-0000-000000000001', concept_id:'33333333-0000-0000-0000-000000000004', mastery_level:58, notes:'Needs to review electron configuration' },
      { student_id:'22222222-0000-0000-0000-000000000002', concept_id:'33333333-0000-0000-0000-000000000001', mastery_level:78, notes:'Good foundation, needs more practice' },
      { student_id:'22222222-0000-0000-0000-000000000002', concept_id:'33333333-0000-0000-0000-000000000002', mastery_level:65, notes:'Working on vertex form' },
      { student_id:'22222222-0000-0000-0000-000000000003', concept_id:'33333333-0000-0000-0000-000000000003', mastery_level:85, notes:'Good grasp of all phases' },
      { student_id:'22222222-0000-0000-0000-000000000003', concept_id:'33333333-0000-0000-0000-000000000005', mastery_level:72, notes:'Developing analytical skills' },
      { student_id:'22222222-0000-0000-0000-000000000004', concept_id:'33333333-0000-0000-0000-000000000006', mastery_level:52, notes:'Foundation building in progress' },
      { student_id:'22222222-0000-0000-0000-000000000005', concept_id:'33333333-0000-0000-0000-000000000001', mastery_level:88, notes:'Strong algebra skills' },
      { student_id:'22222222-0000-0000-0000-000000000005', concept_id:'33333333-0000-0000-0000-000000000005', mastery_level:80, notes:'Good literary analysis' },
    ], { onConflict:'student_id,concept_id' })],
  ];

  for (const [label, fn] of steps) {
    process.stdout.write(`   🔄  ${label} ... `);
    const { error } = await fn();
    if (error) { console.log(`❌  ${error.message}`); return false; }
    console.log('✅');
  }
  return true;
}

// ── Verify ────────────────────────────────────────────────────
async function verify() {
  console.log('\n🔍  Phase 3 — Verification');
  const tables = ['staff','students','concepts','mastery','tasks'];
  let allOk = true;
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (error) { console.log(`   ❌  "${t}": ${error.message}`); allOk = false; }
    else        { console.log(`   ✅  "${t}" accessible`); }
  }
  return allOk;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('  🚀  Supabase Migration — Academic Mastery');
  console.log(`     Project : ${PROJECT_REF}`);
  console.log(`     URL     : ${SUPABASE_URL}`);
  console.log('════════════════════════════════════════════════');

  const schemaOk = await runSchema();
  if (!schemaOk) { console.error('\n💥  Schema failed. Aborting.'); process.exit(1); }

  const seedOk = await runSeed();
  if (!seedOk)   { console.error('\n💥  Seed failed.'); process.exit(1); }

  const allOk = await verify();

  console.log('\n════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅  Migration complete! DB is ready.');
    console.log('  ▶   Run: cd server && npm start');
  } else {
    console.log('  ⚠️   Some tables missing — check errors above.');
  }
  console.log('════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
