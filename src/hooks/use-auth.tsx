import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { login as apiLogin } from "@/lib/login-api";

interface User {
  id: string;
  username: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem("openwrt-user");
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Failed to parse stored user", error);
          localStorage.removeItem("openwrt-user");
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);

    try {
      // Call your backend API
      const result = await apiLogin(username, password);

      if (result.success) {
        const user = {
          id: "1",
          username,
          role: "admin" as const
        };
        setUser(user);
        localStorage.setItem("openwrt-user", JSON.stringify(user));
        toast({
          title: "Login successful",
          description: "Welcome to the OpenWRT Gateway Admin"
        });
      } else {
        throw new Error(result.error || "Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("openwrt-user");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out"
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout
      }}
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

// Additional code to handle login result
const handleLoginResult = async (result: { success: boolean; error?: string }, data: { username: string; password: string }) => {
  if (result.success) {
    sessionStorage.setItem('currentCredentials', JSON.stringify({
      username: data.username,
      password: data.password,
    }));
    window.location.href = "/";
  }
};

