import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("tg_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("tg_token", data.token);
      localStorage.setItem("tg_user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      localStorage.setItem("tg_token", data.token);
      return data;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("tg_token");
    localStorage.removeItem("tg_user");
    setUser(null);
  }

  // Refresh user info on mount
  useEffect(() => {
    const token = localStorage.getItem("tg_token");
    if (token && !user) {
      api.get("/auth/me").then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("tg_user", JSON.stringify(data.user));
      }).catch(() => logout());
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isCentral: user?.role === "central_gov",
    isState: user?.role === "state_gov",
    isContractor: user?.role === "contractor",
    isCommunity: user?.role === "community",
    isAuditor: user?.role === "auditor_ngo",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
