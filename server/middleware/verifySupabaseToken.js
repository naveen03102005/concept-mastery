import { verifySupabaseToken } from '../supabaseClient.js';

/** Express middleware to verify Supabase JWT in Authorization header.
 * On success, sets `req.supabaseUser` and calls `next()`.
 * On failure, responds with 401.
 */
export default async function supabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const user = await verifySupabaseToken(authHeader);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or missing Supabase token' });
  }
  req.supabaseUser = user;
  next();
}
