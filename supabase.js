import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = "https://saibzxiemeowaifhdjkh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWJ6eGllbWVvd2FpZmhkamtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDY0MTAsImV4cCI6MjA2NDk4MjQxMH0.1aBGiaFveeRHc-eqePI_tuQLUd9SAlKuw_7mri_dZkM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 