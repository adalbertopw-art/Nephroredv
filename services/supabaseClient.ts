
export { supabase } from '../lib/supabase';

import { supabase } from '../lib/supabase';

// Helper to get current user quickly
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};
