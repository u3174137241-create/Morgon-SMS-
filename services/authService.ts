import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const authService = {
  isConfigured: isSupabaseConfigured,

  async signInWithEmailOtp(email: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  },

  async getCurrentUserId(): Promise<string | null> {
    if (!isSupabaseConfigured) return "demo-user";
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  },
};
