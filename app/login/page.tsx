"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getGoogleSignInUrl,
  oauthErrorMessages,
} from "@/app/lib/auth";
import { useAuth } from "@/app/context/AuthContext";
import { WebTrakBrand } from "@/app/components/WebTrakBrand";

const TAGLINE =
  "Workforce visibility and project allocation—aligned in one secure workspace.";

/* ------------------------------------------------------------------ */
/* Google G SVG icon                                                     */
/* ------------------------------------------------------------------ */
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Background                                                           */
/* ------------------------------------------------------------------ */
function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#070612]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(99,102,241,0.18), transparent 55%)",
        }}
      />
      <div
        className="absolute -top-40 -left-32 h-[620px] w-[620px] rounded-full opacity-[0.38]"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.85) 0%, transparent 68%)",
          filter: "blur(58px)",
        }}
      />
      <div
        className="absolute top-[28%] -right-28 h-[540px] w-[540px] rounded-full opacity-[0.28]"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.9) 0%, transparent 70%)",
          filter: "blur(72px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background: "linear-gradient(to top, rgba(7,6,18,0.92), transparent)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="fade-up border-l-2 border-red-400/90 pl-4 text-left text-sm leading-relaxed text-red-200/95"
    >
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const didRedirect = useRef(false);
  const didPostLoginRefresh = useRef(false);

  useEffect(() => {
    const rawError = searchParams.get("error");
    if (rawError) {
      setError(oauthErrorMessages[rawError] ?? "An unknown error occurred.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated" && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/dashboard");
    }
  }, [status, router]);

  // On login page, if session becomes valid right after OAuth callback/cookie set,
  // re-check once so roles are populated immediately from /auth/refresh.
  useEffect(() => {
    if (status !== "unauthenticated" || didPostLoginRefresh.current) return;
    didPostLoginRefresh.current = true;
    void (async () => {
      const fresh = await refresh();
      if (fresh && !didRedirect.current) {
        didRedirect.current = true;
        router.replace("/dashboard");
      }
    })();
  }, [status, refresh, router]);

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    window.location.href = getGoogleSignInUrl();
  }

  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-6">
        <MeshBackground />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <WebTrakBrand variant="login" />
          <div
            className="h-10 w-10 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: "var(--wt-indigo-400)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-sm text-slate-400">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col px-6 pb-8 sm:px-8 sm:pb-10">
      <MeshBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center fade-up">
        <section className="flex flex-col items-center gap-5 text-center sm:gap-6">
          <h1 className="sr-only">WebTrak</h1>
          <WebTrakBrand variant="login" />
          <div className="flex max-w-md flex-col gap-2 px-1">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-indigo-200/90">
              Workforce Tracker
            </p>
            <p className="text-[15px] leading-relaxed text-slate-400 sm:text-base">
              {TAGLINE}
            </p>
          </div>
        </section>

        <div className="mt-12 flex w-full flex-col gap-5 sm:mt-14 sm:gap-6">
          {error ? <ErrorBanner message={error} /> : null}

          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="btn-primary w-full max-w-[380px] self-center rounded-lg py-3.5 text-base sm:py-4"
          >
            {googleLoading ? (
              <>
                <span className="spinner" />
                Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleIcon size={22} />
                Continue with Google
              </>
            )}
          </button>

          <p className="max-w-md self-center text-center text-xs leading-relaxed text-slate-400">
            Only registered company accounts can sign in.
            <br />
            Contact your administrator if you need access.
          </p>
        </div>
      </div>

      <p className="relative z-10 shrink-0 pt-6 text-center text-[11px] tracking-wide text-slate-500">
        © {new Date().getFullYear()} WebTrak. All rights reserved.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center px-6">
          <MeshBackground />
          <p className="relative z-10 text-sm text-slate-400">Loading…</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
