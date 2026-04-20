// Shared Supabase client for Vercel serverless functions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Vercel env vars');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/** Shape a task row for the frontend */
export function shapeTask(row) {
  if (!row) return null;
  return {
    _id:           row.id,
    id:            row.id,
    title:         row.title,
    concept:       row.concept,
    description:   row.description,
    dueDate:       row.due_date,
    status:        row.status,
    priority:      row.priority,
    responseText:  row.response_text,
    responseImage: row.response_image,
    feedback:      row.feedback,
    submittedAt:   row.submitted_at,
    approvedAt:    row.approved_at,
    rejectedAt:    row.rejected_at,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    createdBy: row.staff_creator
      ? { _id: row.staff_creator.id, name: row.staff_creator.name }
      : null,
    assignedTo: row.student_assigned
      ? { _id: row.student_assigned.id, name: row.student_assigned.name, grade: row.student_assigned.grade }
      : null,
  };
}

/** Task query with joins */
export function taskQuery() {
  return supabase
    .from('tasks')
    .select(`
      id, title, concept, description, due_date, status, priority,
      response_text, response_image, feedback,
      submitted_at, approved_at, rejected_at, created_at, updated_at,
      staff_creator:staff!tasks_created_by_fkey ( id, name ),
      student_assigned:students!tasks_assigned_to_fkey ( id, name, grade )
    `);
}

/** CORS helper */
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
