/**
 * Central API base URL for all fetch calls.
 *
 * • Development  (npm run dev)  → http://localhost:3001  (Express server)
 * • Production   (Vercel)       → ""  (same origin, /api/* served as serverless functions)
 *
 * Override via VITE_API_URL env var if you deploy the Express backend separately.
 */
const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ??
  ((import.meta as any).env?.DEV ? 'http://localhost:3001' : '');

export default API_BASE_URL;
