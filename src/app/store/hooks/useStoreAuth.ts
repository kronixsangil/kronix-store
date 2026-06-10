//src\app\store\hooks\useStoreAuth.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearStoreToken,
  loadStoreCode,
  saveStoreCode,
} from "../lib/storeUtils";

function getApiBase() {
  if (typeof window !== "undefined") {
    return "/api/store";
  }

  return process.env.NEXT_PUBLIC_API || "http://localhost:3004";
}

function apiUrl(path: string) {
  return `${getApiBase()}${path}`;
}

function getStoreWrongRoleMessage(role?: string | null) {
  const r = String(role ?? "").toUpperCase();

  if (r === "BUYER") return "Tu cuenta es de cliente. Debes ingresar desde la app Buyer.";
  if (r === "DRIVER") return "Tu cuenta es de conductor. Debes ingresar desde la app Driver.";
  if (r === "ADMIN" || r === "FINANCE") return "Tu cuenta es administrativa. Debes ingresar desde el CTCC.";

  return "Debes ingresar con un usuario de tienda válido para usar esta app.";
}

function isValidKronixPassword(value: string) {
  const clean = String(value ?? "").trim();
  return clean.length >= 8 && /[a-zA-Z]/.test(clean) && /\d/.test(clean);
}

const KRONIX_PASSWORD_POLICY_MESSAGE =
  "La nueva contraseña debe tener mínimo 8 caracteres y combinar letras y números. No necesita símbolos.";

function readApiErrorMessage(raw: string) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    const message = String(parsed?.message ?? parsed?.error ?? "").trim();
    return message || text;
  } catch {
    return text;
  }
}

export function useStoreAuth() {
  const [storeCode, setStoreCode] = useState<string>("");
  const [inputStoreCode, setInputStoreCode] = useState<string>("");

  const [accessToken, setAccessToken] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const [loginStoreCode, setLoginStoreCode] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [authView, setAuthView] = useState<"LOGIN" | "FORGOT">("LOGIN");
  const [forgotIdentifier, setForgotIdentifier] = useState<string>("");
  const [forgotStep, setForgotStep] = useState<"REQUEST" | "CONFIRM">("REQUEST");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

  const [resetCode, setResetCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newPassword2, setNewPassword2] = useState<string>("");

  const refreshingRef = useRef<Promise<string> | null>(null);

  function requestStorePushRegistration(delayMs = 900) {
    try {
      if (typeof window === "undefined") return;

      window.setTimeout(() => {
        window.dispatchEvent(new Event("kronix-store-auth-ready"));

        const fn = (window as any).__kronixRegisterStorePush;
        if (typeof fn === "function") {
          fn();
        }
      }, delayMs);
    } catch {}
  }

  function isUnauthorizedErrMessage(msg: string) {
    const m = String(msg || "").toLowerCase();
    return m.includes("unauthorized") || m.includes("401");
  }

  const clearLocalStoreSession = useCallback(() => {
    clearStoreToken();
    setAccessToken("");
    setAccessDeniedMessage(null);
    setMustChangePassword(false);
  }, []);

  async function logoutWithoutPause() {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        headers: { "x-ct-app": "store" },
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    clearLocalStoreSession();
  }

  async function verifyStoreRole() {
    setCheckingRole(true);

    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "GET",
        headers: {
          "x-ct-app": "store",
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = (await res.json()) as any;
      const user = data?.user ?? data ?? null;
      const role = String(user?.role ?? "").toUpperCase();
      const storeId = String(user?.storeId ?? "").trim();
      const storeCodeFromUser = String(user?.storeCode ?? "").trim();
      setMustChangePassword(Boolean(user?.mustChangePassword));

      if (role !== "STORE" || !storeId) {
        await logoutWithoutPause();
        setAccessDeniedMessage(getStoreWrongRoleMessage(role));
        return false;
      }

      if (storeCodeFromUser) {
        saveStoreCode(storeCodeFromUser);
        setStoreCode(storeCodeFromUser);
        setInputStoreCode(storeCodeFromUser);
      }

      setAccessDeniedMessage(null);
      return true;
    } catch {
      return false;
    } finally {
      setCheckingRole(false);
    }
  }

  async function restoreSessionFromCookie() {
    const ok = await verifyStoreRole();

    if (ok) {
      setAccessToken("COOKIE_AUTH");
      requestStorePushRegistration(1200);
      return true;
    }

    try {
      await refreshStoreSession();
      const okAfterRefresh = await verifyStoreRole();

      if (okAfterRefresh) {
        setAccessToken("COOKIE_AUTH");
        requestStorePushRegistration(1200);
        return true;
      }
    } catch {}

    setAccessToken("");
    return false;
  }

  useEffect(() => {
    let alive = true;

    async function bootAuth() {
      const saved = loadStoreCode();

      if (!alive) return;

      setStoreCode(saved);
      setInputStoreCode(saved);
      setLoginStoreCode("");

      await restoreSessionFromCookie();

      if (!alive) return;
      setAuthChecked(true);
    }

    bootAuth();

    return () => {
      alive = false;
    };
  }, []);

  async function refreshStoreSession(): Promise<string> {
    if (refreshingRef.current) return refreshingRef.current;

    refreshingRef.current = (async () => {
      const res = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        headers: { "x-ct-app": "store" },
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Refresh failed (${res.status})`);
      }

      await res.json().catch(() => null);
      return "COOKIE_OK";
    })();

    try {
      return await refreshingRef.current;
    } finally {
      refreshingRef.current = null;
    }
  }

  async function storeFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
    const headers: Record<string, string> = {
      "x-ct-app": "store",
      ...(init?.headers ? (init.headers as any) : {}),
    };

    const code = String(storeCode ?? "").trim();
    if (code) headers["x-store-code"] = code;

    const res = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });

    if (res.status === 401 && retry) {
      await refreshStoreSession();

      const res2 = await fetch(apiUrl(path), {
        ...init,
        headers,
        credentials: "include",
      });

      if (!res2.ok) {
        const txt2 = await res2.text().catch(() => "");
        throw new Error(readApiErrorMessage(txt2) || `Error ${res2.status}`);
      }

      const ct2 = res2.headers.get("content-type") || "";
      return (ct2.includes("application/json") ? await res2.json() : ((await res2.text()) as any)) as T;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(readApiErrorMessage(txt) || `Error ${res.status}`);
    }

    const ct = res.headers.get("content-type") || "";
    return (ct.includes("application/json") ? await res.json() : ((await res.text()) as any)) as T;
  }

  async function doLogin() {
    if (loggingIn) return;
    setLoginErr(null);
    setAccessDeniedMessage(null);
    setLoggingIn(true);

    try {
      const identifier = String(loginStoreCode ?? "").trim();
      const pass = String(loginPassword ?? "").trim();

      if (!identifier || !pass) {
        setLoginErr("Ingresa usuario y contraseña.");
        return;
      }

      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ct-app": "store",
        },
        credentials: "include",
        body: JSON.stringify({ emailOrPhone: identifier, password: pass }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(readApiErrorMessage(txt) || `Error ${res.status}`);
      }

      await res.json().catch(() => null);

      const accessOk = await verifyStoreRole();
      if (!accessOk) return;

      setAccessToken("COOKIE_AUTH");
      requestStorePushRegistration(1000);
    } catch (e: any) {
      setLoginErr(e?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoggingIn(false);
    }
  }

  async function requestPasswordReset() {
    if (forgotLoading) return;
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const identifier = String(forgotIdentifier ?? "").trim();
      if (!identifier) {
        setForgotErr("Ingresa tu usuario (ej: store1) o tu teléfono/email.");
        return;
      }

      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ct-app": "store",
        },
        credentials: "include",
        body: JSON.stringify({ emailOrPhone: identifier }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(readApiErrorMessage(txt) || `Error ${res.status}`);
      }

      setForgotMsg(
        "Solicitud recibida ✅ Si la cuenta existe, recibirás las instrucciones de recuperación por el canal autorizado."
      );
      setForgotStep("CONFIRM");
    } catch (e: any) {
      setForgotErr(e?.message ?? "No se pudo solicitar la recuperación.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function confirmPasswordReset() {
    if (forgotLoading) return;
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const identifier = String(forgotIdentifier ?? "").trim();
      const code = String(resetCode ?? "").trim();
      const p1 = String(newPassword ?? "").trim();
      const p2 = String(newPassword2 ?? "").trim();

      if (!identifier) {
        setForgotErr("Ingresa tu usuario (ej: store1) o tu teléfono/email.");
        return;
      }
      if (!code) {
        setForgotErr("Ingresa el código de recuperación.");
        return;
      }
      if (!isValidKronixPassword(p1)) {
        setForgotErr(KRONIX_PASSWORD_POLICY_MESSAGE);
        return;
      }
      if (p1 !== p2) {
        setForgotErr("Las contraseñas no coinciden.");
        return;
      }

      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ct-app": "store",
        },
        credentials: "include",
        body: JSON.stringify({ emailOrPhone: identifier, code, newPassword: p1 }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        const message = readApiErrorMessage(txt);
        if (message.toLowerCase().includes("contraseña") || message.toLowerCase().includes("password")) {
          setForgotErr(KRONIX_PASSWORD_POLICY_MESSAGE);
          return;
        }
        throw new Error(message || `Error ${res.status}`);
      }

      setForgotMsg("Contraseña actualizada ✅ Ya puedes iniciar sesión.");
      setLoginStoreCode("");
      setLoginPassword("");
      setAuthView("LOGIN");
      setForgotStep("REQUEST");
      setResetCode("");
      setNewPassword("");
      setNewPassword2("");
    } catch (e: any) {
      setForgotErr(e?.message ?? "No se pudo actualizar la contraseña.");
    } finally {
      setForgotLoading(false);
    }
  }

  function openForgot() {
    setLoginErr(null);
    setForgotErr(null);
    setForgotMsg(null);
    setForgotIdentifier(String(loginStoreCode ?? "").trim());
    setForgotStep("REQUEST");
    setResetCode("");
    setNewPassword("");
    setNewPassword2("");
    setAuthView("FORGOT");
  }

  function backToLogin() {
    setForgotErr(null);
    setForgotMsg(null);
    setForgotStep("REQUEST");
    setResetCode("");
    setNewPassword("");
    setNewPassword2("");
    setAuthView("LOGIN");
  }

  async function doLogout() {
    try {
      if (accessToken?.trim()) {
        try {
          await storeFetch(`/stores/me/state`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state: "PAUSED",
              pausedReason: "Tienda en pausa por cierre de sesión",
            }),
          });
        } catch (pauseErr) {
          console.error("No se pudo pausar la tienda antes del logout:", pauseErr);
        }
      }

      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        headers: { "x-ct-app": "store" },
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    clearStoreToken();
    setAccessToken("");
    setAccessDeniedMessage(null);
    setMustChangePassword(false);
  }

  function applyStoreCode() {
    const code = String(inputStoreCode ?? "").trim();
    if (!code) return;
    saveStoreCode(code);
    setStoreCode(code);
  }

  return {
    storeCode,
    inputStoreCode,
    setInputStoreCode,
    applyStoreCode,

    accessToken,
    authChecked,
    checkingRole,
    accessDeniedMessage,
    mustChangePassword,
    setMustChangePassword,

    loginStoreCode,
    setLoginStoreCode,
    loginPassword,
    setLoginPassword,
    showPassword,
    setShowPassword,
    loggingIn,
    loginErr,

    authView,
    setAuthView,
    forgotIdentifier,
    setForgotIdentifier,
    forgotStep,
    setForgotStep,
    forgotLoading,
    forgotMsg,
    forgotErr,
    resetCode,
    setResetCode,
    newPassword,
    setNewPassword,
    newPassword2,
    setNewPassword2,

    isUnauthorizedErrMessage,
    clearLocalStoreSession,
    logoutWithoutPause,
    verifyStoreRole,
    refreshStoreSession,
    storeFetch,

    doLogin,
    requestPasswordReset,
    confirmPasswordReset,
    openForgot,
    backToLogin,
    doLogout,
  };
}