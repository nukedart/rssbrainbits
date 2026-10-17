import { createContext, useContext, useEffect, useState } from "react";
import { mergeUser } from "../lib/mergeUser";
import { supabase, signInWithGitHub, signInWithGoogle, signInWithMagicLink, signOut, onAuthChange } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    let active = true;
    const apply = (next) => { if (active) setUser((prev) => mergeUser(prev, next)); };
    supabase.auth.getSession()
      .then(({ data: { session } }) => apply(session?.user ?? null))
      .catch(() => apply(null));
    const { data: { subscription } } = onAuthChange(apply);
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn: signInWithGitHub, signInWithGoogle, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
