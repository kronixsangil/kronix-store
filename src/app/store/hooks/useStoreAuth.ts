//src\app\store\hooks\useStoreAuth.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearStoreToken,
  loadStoreCode,
  loadStoreToken,
  saveStoreCode,
  saveStoreToken,
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

export function useStoreAuth() {
  const [storeCode, setStoreCode] = useState<string>("1");
  const [inputStoreCode, setInputStoreCode] = useState<string>("1");

  const [accessToken, setAccessToken] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

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

  useEffect(() => {
    const saved = loadStoreCode();
    setStoreCode(saved);
    setInputStoreCode(saved);
    setLoginStoreCode("");

    setAccessToken("");

    setAuthChecked(true);
  }, []);

  function isUnauthorizedErrMessage(msg: string) {
    const m = String(msg || "").toLowerCase();
    return m.includes("unauthorized") || m.includes("401");
  }

  const clearLocalStoreSession = useCallback(() => {
    clearStoreToken();
    setAccessToken("");
    setAccessDeniedMessage(null);
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

  async function verifyStoreRole(tokenOverride?: string) {
    const token = "COOKIE_AUTH";

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
      const user = data?.user ?? null;
      const role = String(user?.role ?? "").toUpperCase();
      const storeId = String(user?.storeId ?? "").trim();
      const storeCodeFromUser = String(user?.storeCode ?? "").trim();

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
      await logoutWithoutPause();
      return false;
    } finally {
      setCheckingRole(false);
    }
  }

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
    const tok = "";

    const headers: Record<string, string> = {
      "x-ct-app": "store",
      ...(init?.headers ? (init.headers as any) : {}),
    };

    const code = String(storeCode ?? "").trim();
    if (!tok && code) headers["x-store-code"] = code;

    const res = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });

    if (res.status === 401 && retry) {
      await refreshStoreSession();

const headers2: Record<string, string> = {
  ...headers,
};

      const res2 = await fetch(apiUrl(path), {
        ...init,
        headers: headers2,
        credentials: "include",
      });

      if (!res2.ok) {
        const txt2 = await res2.text().catch(() => "");
        throw new Error(txt2 || `Error ${res2.status}`);
      }

      const ct2 = res2.headers.get("content-type") || "";
      return (ct2.includes("application/json") ? await res2.json() : ((await res2.text()) as any)) as T;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Error ${res.status}`);
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
        throw new Error(txt || `Error ${res.status}`);
      }

      const out = (await res.json()) as any;
      const accessOk = await verifyStoreRole();
if (!accessOk) return;

setAccessToken("COOKIE_AUTH");
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

      const res = await fetch(apiUrl("/auth/request-password-reset"), {
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
        if (res.status === 404) {
          setForgotErr(
            "Aún no está habilitada la recuperación automática en el backend. (Falta endpoint /auth/request-password-reset)."
          );
          return;
        }
        throw new Error(txt || `Error ${res.status}`);
      }

      setForgotMsg("Listo ✅ Te enviamos un código de recuperación. Revisa SMS / WhatsApp / Email según tu cuenta.");
      setForgotStep("CONFIRM");
    } catch (e: any) {
      setForgotErr(e?.message ?? "No se pudo solicitar el código.");
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
      if (!p1 || p1.length < 6) {
        setForgotErr("La nueva contraseña debe tener al menos 6 caracteres.");
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
        if (res.status === 404) {
          setForgotErr("Aún no está habilitado el reset en backend. (Falta endpoint /auth/reset-password).");
          return;
        }
        throw new Error(txt || `Error ${res.status}`);
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
    setAuthView("FORGOT");
  }

  function backToLogin() {
    setForgotErr(null);
    setForgotMsg(null);
    setForgotStep("REQUEST");
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