"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  site?: { _id: string; name: string } | null;
  department?: { _id: string; name: string; code: string } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async (tkn: string) => {
    try {
      const res = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      setUser(res.data.user);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    // httpOnly cookies can't be read by JS — use localStorage as the client-side token store.
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchMe(storedToken).finally(() => setLoading(false));
    } else {
      // No token at all — mark as done so the layout can redirect
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await axios.post("/api/auth/login", { email, password });
    const { token: tkn, user: u } = res.data;
    // The server sets the httpOnly cookie via Set-Cookie header.
    // We store the token in state and localStorage for client-side API calls,
    // but do NOT write a duplicate js-cookie — that conflicts with the httpOnly one.
    setToken(tkn);
    setUser(u);
    localStorage.setItem("token", tkn);
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isManager: user?.role === "manager" || user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
