import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const hasConfig = !!(url && anonKey);

if (!hasConfig && typeof window !== 'undefined') {
  console.warn('Relevamiento Gesell: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (ej. GitHub Secrets).');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);
export const hasSupabaseConfig = hasConfig;
