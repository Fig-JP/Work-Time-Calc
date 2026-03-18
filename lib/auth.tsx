import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAuthReady: true,
  login: async () => {},
  logout: async () => {},
});

const FALLBACK_API = "https://chu-tui-qin-guan-li-gei-yu-tui-ce--dazhixiaolin274.replit.app";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "fig-jp.github.io" || hostname.endsWith(".github.io")) {
      return FALLBACK_API;
    }
  }
  return FALLBACK_API;
}

const isWeb = Platform.OS === "web";

async function storeToken(token: string): Promise<void> {
  if (isWeb) {
    try { localStorage.setItem(AUTH_TOKEN_KEY, token); } catch {}
  } else {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }
}

async function loadToken(): Promise<string | null> {
  if (isWeb) {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function clearToken(): Promise<void> {
  if (isWeb) {
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
  } else {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const popupRef = useRef<Window | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = await loadToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        await clearToken();
        setUser(null);
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        await clearToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const authToken = params.get("auth_token");
    const isPopup = params.get("popup") === "1";
    if (authToken) {
      storeToken(authToken).then(async () => {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth_token");
        url.searchParams.delete("popup");
        window.history.replaceState({}, "", url.toString());
        if (isPopup) {
          window.close();
        }
        await fetchUser();
      });
    }
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isWeb) return;

    const msgHandler = async (event: MessageEvent) => {
      if (event.data?.type === "AUTH_TOKEN" && event.data?.token) {
        const token = event.data.token as string;
        await storeToken(token);
        setIsLoading(true);
        await fetchUser();
      }
    };

    const storageHandler = async (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY && event.newValue) {
        setIsLoading(true);
        await fetchUser();
      }
    };

    window.addEventListener("message", msgHandler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("message", msgHandler);
      window.removeEventListener("storage", storageHandler);
    };
  }, [fetchUser]);

  const login = useCallback(async () => {
    const apiBase = getApiBaseUrl();

    if (isWeb) {
      const loginUrl = `${apiBase}/api/login?returnTo=${encodeURIComponent("/__web_return")}`;
      window.location.href = loginUrl;
      return;
    }

    try {
      const loginUrl = `${apiBase}/api/login?returnTo=${encodeURIComponent("/__mobile_return")}`;
      const redirectUrl = "timecard://oauth/callback";

      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);

      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const token = parsed.searchParams.get("auth_token");
        if (token) {
          await storeToken(token);
          setIsLoading(true);
          await fetchUser();
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);

    if (isWeb) {
      const apiBase = getApiBaseUrl();
      try {
        await fetch(`${apiBase}/api/logout`, { credentials: "include" });
      } catch {}
    } else {
      try {
        const token = await loadToken();
        if (token) {
          const apiBase = getApiBaseUrl();
          await fetch(`${apiBase}/api/mobile-auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {}
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAuthReady: true,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
