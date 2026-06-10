//src\app\store\components\auth\StoreAuthScreen.tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";

type Props = {
  authView: "LOGIN" | "FORGOT";
  loginStoreCode: string;
  setLoginStoreCode: Dispatch<SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: Dispatch<SetStateAction<string>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  loggingIn: boolean;
  loginErr: string | null;
  accessDeniedMessage: string | null;
  doLogin: () => void | Promise<void>;
  openForgot: () => void;
  forgotIdentifier: string;
  setForgotIdentifier: Dispatch<SetStateAction<string>>;
  forgotStep: "REQUEST" | "CONFIRM";
  setForgotStep: Dispatch<SetStateAction<"REQUEST" | "CONFIRM">>;
  forgotLoading: boolean;
  forgotMsg: string | null;
  forgotErr: string | null;
  resetCode: string;
  setResetCode: Dispatch<SetStateAction<string>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  newPassword2: string;
  setNewPassword2: Dispatch<SetStateAction<string>>;
  requestPasswordReset: () => void | Promise<void>;
  confirmPasswordReset: () => void | Promise<void>;
  backToLogin: () => void;
};

export default function StoreAuthScreen({
  authView,
  loginStoreCode,
  setLoginStoreCode,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  loggingIn,
  loginErr,
  accessDeniedMessage,
  doLogin,
  openForgot,
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
  requestPasswordReset,
  confirmPasswordReset,
  backToLogin,
}: Props) {
  return (
    <main className="h-screen min-h-screen overflow-y-auto ct-store-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-[1240px] px-3 py-3 sm:px-4">
        <div className="overflow-visible rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.95)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/70 via-white/20 to-slate-100/40" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.42] [background:radial-gradient(700px_circle_at_16%_18%,rgba(16,185,129,0.13),transparent_42%),radial-gradient(820px_circle_at_82%_24%,rgba(37,99,235,0.12),transparent_42%),radial-gradient(760px_circle_at_58%_92%,rgba(15,23,42,0.07),transparent_52%)]" />

            <div className="relative min-h-[calc(100vh-24px)] px-3 py-3 sm:px-4 sm:py-4">
              <div className="grid w-full min-w-[760px] grid-cols-[60%_40%] gap-4 lg:gap-5">
                <section className="rounded-[28px] border border-slate-200/80 bg-white/78 p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)] backdrop-blur sm:p-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="relative h-[64px] w-[210px] shrink-0 sm:h-[72px] sm:w-[220px]">
                      <Image
                        src="/branding/kronix/header-logo.png"
                        alt="KroniX"
                        fill
                        className="object-contain object-left drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]"
                        priority
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-slate-600">
                        App Tiendas · Panel Premium
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 sm:mt-8">
                    <div className="text-[24px] font-extrabold leading-[1.08] text-slate-900 sm:text-[26px]">
                      Control total de tu operación
                    </div>

                    <div className="mt-3 max-w-xl text-[14px] font-semibold leading-relaxed text-slate-600">
                      Confirma pedidos, revisa ganancias, y gestiona tu tienda con una
                      experiencia fluida tipo “app real”.
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:mt-7">
                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
                        <div className="text-[14px] font-extrabold text-slate-900">
                          ⚡ Rápido
                        </div>
                        <div className="mt-1 text-[13px] leading-snug text-slate-600">
                          Actualizaciones y UI limpia para tablet.
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
                        <div className="text-[14px] font-extrabold text-slate-900">
                          🔒 Seguro
                        </div>
                        <div className="mt-1 text-[13px] leading-snug text-slate-600">
                          Sesión con token + cookies por app.
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
                        <div className="text-[14px] font-extrabold text-slate-900">
                          💰 Ganancias
                        </div>
                        <div className="mt-1 text-[13px] leading-snug text-slate-600">
                          Cálculo por tienda, basado en snapshot.
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
                        <div className="text-[14px] font-extrabold text-slate-900">
                          🧾 Pedidos
                        </div>
                        <div className="mt-1 text-[13px] leading-snug text-slate-600">
                          Pendientes · En ruta · Entregados.
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[20px] bg-slate-900 px-5 py-5 text-white shadow-[0_10px_24px_rgba(15,23,42,0.10)] sm:mt-7">
                      <div className="text-[14px] font-extrabold">
                        Tip operativo
                      </div>
                      <div className="mt-1 text-[13px] leading-relaxed text-white/80">
                        Recuerda Iniciar/Cerrar sesión con tu usuario al
                        Iniciar/Terminar tu turno de trabajo.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                  <div className="p-5 sm:p-8">
                    {authView === "LOGIN" ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[20px] font-extrabold text-slate-900">
                              Iniciar sesión
                            </div>
                            <div className="mt-1 text-[13px] font-semibold text-slate-600">
                              Accede al panel de tu tienda
                            </div>
                          </div>

                          <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-slate-50 text-[18px]">
                            🏪
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div>
                            <div className="text-[13px] font-extrabold text-slate-700">
                              Usuario Tienda
                            </div>

                            <input
                              value={loginStoreCode}
                              onChange={(e) => setLoginStoreCode(e.target.value)}
                              className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-200"
                              placeholder="Teléfono"
                            />

                            <div className="mt-2 text-[11px] font-semibold text-slate-500">
                              Ingresa tu teléfono o email para ingresar.
                            </div>
                          </div>

                          <div>
                            <div className="relative">
                              <input
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                type={showPassword ? "text" : "password"}
                                className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 pr-14 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="Contraseña"
                              />

                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 top-[50%] translate-y-[-50%] text-[18px]"
                              >
                                {showPassword ? "🙈" : "👁"}
                              </button>
                            </div>
                          </div>                                                    {loginErr ? (
                            <div className="rounded-[18px] bg-red-50 p-4 text-[13px] text-red-800 ring-1 ring-red-200">
                              {loginErr}
                            </div>
                          ) : null}

                          {accessDeniedMessage ? (
                            <div className="rounded-[18px] bg-amber-50 p-4 text-[13px] text-amber-900 ring-1 ring-amber-200">
                              {accessDeniedMessage}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={doLogin}
                            disabled={loggingIn}
                            className="mt-2 inline-flex h-[56px] w-full items-center justify-center rounded-[18px] bg-emerald-600 px-6 text-[16px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {loggingIn ? "Ingresando…" : "Ingresar"}
                          </button>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                              type="button"
                              onClick={openForgot}
                              className="text-[13px] font-extrabold text-blue-600 hover:text-blue-700"
                            >
                              ¿Olvidaste tu contraseña?
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[20px] font-extrabold text-slate-900">
                              Recuperar acceso
                            </div>

                            <div className="mt-1 text-[13px] font-semibold text-slate-600">
                              Solicita recuperación y usa la contraseña temporal autorizada por KroniX
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={backToLogin}
                            className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-extrabold text-slate-700 hover:bg-slate-100"
                          >
                            ← Volver
                          </button>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                            <div className="text-[11px] font-bold text-slate-500">
                              Paso {forgotStep === "REQUEST" ? "1" : "2"} de 2
                            </div>

                            <div className="mt-1 text-[13px] font-extrabold text-slate-900">
                              {forgotStep === "REQUEST"
                                ? "Solicitar código"
                                : "Confirmar y cambiar contraseña"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[13px] font-extrabold text-slate-700">
                              Usuario / Teléfono / Email
                            </div>

                            <input
                              value={forgotIdentifier}
                              onChange={(e) =>
                                setForgotIdentifier(e.target.value)
                              }
                              className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 text-[16px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="store1"
                            />
                          </div>

                          {forgotStep === "CONFIRM" ? (
                            <>
                              <div>
                                <div className="text-[13px] font-extrabold text-slate-700">
                                  Código
                                </div>

                                <input
                                  value={resetCode}
                                  onChange={(e) =>
                                    setResetCode(e.target.value)
                                  }
                                  className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 text-[16px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                                  placeholder="123456"
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <div className="text-[13px] font-extrabold text-slate-700">
                                    Nueva contraseña
                                  </div>

                                  <input
                                    value={newPassword}
                                    onChange={(e) =>
                                      setNewPassword(e.target.value)
                                    }
                                    type="password"
                                    className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 text-[16px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Ej: Kronix123"
                                  />
                                </div>

                                <div>
                                  <div className="text-[13px] font-extrabold text-slate-700">
                                    Confirmar
                                  </div>

                                  <input
                                    value={newPassword2}
                                    onChange={(e) =>
                                      setNewPassword2(e.target.value)
                                    }
                                    type="password"
                                    className="mt-2 h-[52px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-5 text-[16px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Ej: Kronix123"
                                  />
                                </div>
                              </div>
                            </>
                          ) : null}

                          {forgotErr ? (
                            <div className="rounded-[18px] bg-red-50 p-4 text-[13px] text-red-800 ring-1 ring-red-200">
                              {forgotErr}
                            </div>
                          ) : null}

                          {forgotMsg ? (
                            <div className="rounded-[18px] bg-emerald-50 p-4 text-[13px] text-emerald-900 ring-1 ring-emerald-200">
                              {forgotMsg}
                            </div>
                          ) : null}

                          {forgotStep === "REQUEST" ? (
                            <button
                              type="button"
                              onClick={requestPasswordReset}
                              disabled={forgotLoading}
                              className="inline-flex h-[56px] w-full items-center justify-center rounded-[18px] bg-slate-900 px-6 text-[16px] font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              {forgotLoading
                                ? "Enviando…"
                                : "Enviar código"}
                            </button>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setForgotStep("REQUEST");
                                }}
                                disabled={forgotLoading}
                                className="inline-flex h-[56px] w-full items-center justify-center rounded-[18px] bg-white px-6 text-[16px] font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                              >
                                Volver
                              </button>

                              <button
                                type="button"
                                onClick={confirmPasswordReset}
                                disabled={forgotLoading}
                                className="inline-flex h-[56px] w-full items-center justify-center rounded-[18px] bg-emerald-600 px-6 text-[16px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {forgotLoading
                                  ? "Guardando…"
                                  : "Cambiar contraseña"}
                              </button>
                            </div>
                          )}

                          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-[13px] leading-snug text-slate-600">
                            Si no recibes respuesta, verifica tu número/email asociado o contacta soporte.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}