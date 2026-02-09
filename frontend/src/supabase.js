import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const hasConfig = !!(url && anonKey);

if (typeof document !== 'undefined' && url) {
  try {
    const origin = new URL(url).origin;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch (_) {}
}

if (!hasConfig && typeof window !== 'undefined') {
  console.warn('Relevamiento Gesell: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (ej. GitHub Secrets).');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);
export const hasSupabaseConfig = hasConfig;
export const supabaseUrlForDebug = hasConfig ? url.replace(/\/$/, '') : null;
