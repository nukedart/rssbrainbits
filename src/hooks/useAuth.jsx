import { createContext, useContext, useEffect, useState } from "react";
import { supabase, signInWithGitHub, signOut, onAuthChange } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = onAuthChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn: signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
