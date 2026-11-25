import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { login as apiLogin, logout as apiLogout } from "@/lib/login-api";
import { onSessionExpired, setSession } from "@/lib/ubus";
import { brand } from "@/lib/brand";

interface User {
  username: string;
}

interface StoredSession {
  username: string;
  sid: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only the rpcd session id is stored, never the password.
const STORAGE_KEY = "gateway-session";

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.sid === "string" && typeof parsed?.username === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  setSession(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const endSession = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  // Restore a previous session and react when the gateway rejects it.
  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      setSession(stored.sid);
      setUser({ username: stored.username });
    }

    onSessionExpired(() => {
      endSession();
      toast({
        title: "Session expired",
        description: "Please log in again.",
        variant: "destructive",
      });
    });

    setIsLoading(false);
    return () => onSessionExpired(null);
  }, [endSession]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const sid = await apiLogin(username, password);
      setSession(sid);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, sid }));
      } catch {
        /* session still works for this tab */
      }
      setUser({ username });
      toast({ title: "Login successful", description: `Welcome to ${brand.name}` });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Close the session on the gateway; log out locally even if it is unreachable.
    apiLogout().catch(() => undefined);
    endSession();
    toast({ title: "Logged out", description: "You have been successfully logged out" });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
