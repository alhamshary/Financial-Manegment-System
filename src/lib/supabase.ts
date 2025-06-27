import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ttsuftqckhdzkzvttpww.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0c3VmdHFja2hkemt6dnR0cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI2MjUsImV4cCI6MjA2NjQzODYyNX0.yk7DT_r5tZ9rF3k6xq32Wb0sxTVpHO14lSK1sPyfvpk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
