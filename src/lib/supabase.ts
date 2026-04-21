import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pdznfqregaqnddynfyfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkem5mcXJlZ2FxbmRkeW5meWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjMzMjgsImV4cCI6MjA5MTIzOTMyOH0.DK5SnVhegaey0ZFCZjMjU4kBqmd7NryFp0CLQhqufUQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
