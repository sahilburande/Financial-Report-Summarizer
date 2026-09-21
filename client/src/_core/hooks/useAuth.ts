import { useMemo } from "react";

export function useAuth() {
  const user = useMemo(() => ({
    id: 0,
    openId: "guest",
    name: "Guest",
    email: null,
    loginMethod: "guest",
    role: "user",
  }), []);

  return {
    user,
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: async () => ({ data: user }),
    logout: async () => {},
  };
}
