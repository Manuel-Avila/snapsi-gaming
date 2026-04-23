import { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import api from "@/api/apiClient";
import { useQueryClient } from "react-query";

type RegisterData = {
  name: string;
  username: string;
  password: string;
  email: string;
  gender: string;
  age: number;
};

type LoginData = {
  email: string;
  password: string;
};

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("access_token");
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error("Failed to load token", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (data: LoginData) => {
    const response = await api.post("/auth/login", data);
    const { token: newToken } = response.data;

    if (newToken) {
      await SecureStore.setItemAsync("access_token", newToken);
      setToken(newToken);
    }
  };

  const register = async (data: RegisterData) => {
    const response = await api.post("/auth/register", data);

    return response.data;
  };

  const logout = async () => {
    setToken(null);
    queryClient.clear();
    await SecureStore.deleteItemAsync("access_token");
  };

  const value = {
    token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
