import { createClient } from '@supabase/supabase-js';

// Ganti nilai di bawah dengan URL dan Anon Key dari Dashboard Supabase Anda
const SUPABASE_URL = 'https://XXXXXXXXXXXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
