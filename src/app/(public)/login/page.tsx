"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLocale } from "@/i18n/locale-provider";
import {
    consolePath,
    organizationsPath as buildOrganizationsPath,
    tenantsPath as buildTenantsPath,
    hardNavigate,
} from "@/lib/auth-wizard-navigation";
import { bffPostEnvelope } from "@/lib/bff-client";
import { useAuthWizardStore } from "@/stores/auth-wizard-store";
import type { components } from "@/types/schemas-auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center yypay:bg-background">
          <Loader2 className="yypay:h-8 yypay:w-8 yypay:animate-spin yypay:text-primary" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const stepParam = searchParams.get("step");
  const {
    setCredentials,
    setDiscoverData,
    setSelectionToken,
    mfaToken,
    email,
    password,
  } = useAuthWizardStore();
  const step = stepParam === "mfa" ? "mfa" : "credentials";
  const [principal, setPrincipal] = useState(email);
  const [secret, setSecret] = useState(password);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function tenantsPath() {
    return buildTenantsPath(returnTo);
  }

  function organizationsPath() {
    return buildOrganizationsPath(returnTo);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await bffPostEnvelope<DiscoverLoginContextsResponse>(
        "/api/auth/discover-contexts",
        { principal, password: secret },
      );
      const data = result.data;
      if (!data?.selectionToken) {
        throw new Error(t.login.invalidCredentials);
      }

      setCredentials(principal, secret);
      setSelectionToken(data.selectionToken);
      setDiscoverData(data);
      toast.success(t.login.credentialsValidated);
      hardNavigate(tenantsPath());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const toConsole = searchParams.get("next") === "console";
      const wizard = useAuthWizardStore.getState();
      await bffPostEnvelope("/api/auth/login/mfa/confirm", {
        mfaToken: mfaToken || wizard.mfaToken,
        code,
        // Session déjà scopée à l'organisation choisie : le BFF garde son cookie au lieu de l'effacer,
        // sinon le proxy renvoie aux organisations et un nouveau select-context redemande un code.
        ...(toConsole && wizard.pendingOrganizationId
          ? { organizationId: wizard.pendingOrganizationId }
          : {}),
      });
      if (toConsole) {
        wizard.clearSensitive();
      }
      toast.success(t.login.authSuccess);
      hardNavigate(toConsole ? consolePath(returnTo) : organizationsPath());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.login.invalidMfaCode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <SiteHeader />
      <main id="contenu" tabIndex={-1} className="yypay:focus:outline-none yypay:flex yypay:flex-1 yypay:items-center yypay:justify-center yypay:px-4 yypay:py-10">
        <Card className="yypay:w-full yypay:max-w-lg yypay:shadow-md">
          <CardHeader className="yypay:pb-2">
            {step === "credentials" ? (
              <>
                <CardTitle className="yypay:text-2xl">{t.login.welcomeBackTitle}</CardTitle>
                <CardDescription>
                  {t.login.welcomeBackDescription}
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="yypay:text-2xl">
                  {t.login.mfaTitle}
                </CardTitle>
                <CardDescription>
                  {t.login.mfaDescription}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
              <form onSubmit={handleLogin} className="yypay:space-y-4">
                <div className="yypay:space-y-2">
                  <Label htmlFor="identifier">{t.login.emailLabel}</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={t.login.emailPlaceholder}
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="yypay:space-y-2">
                  <Label htmlFor="password">{t.login.passwordLabel}</Label>
                  <div className="yypay:relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.login.passwordPlaceholder}
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required
                      className="yypay:pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-pressed={showPassword}
                      className="yypay:absolute yypay:right-1 yypay:top-1/2 yypay:flex yypay:h-9 yypay:w-9 yypay:-translate-y-1/2 yypay:items-center yypay:justify-center yypay:rounded-md yypay:text-secondary yypay:hover:bg-muted"
                      aria-label={
                        showPassword
                          ? t.login.hidePassword
                          : t.login.showPassword
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="yypay:h-4 yypay:w-4" />
                      ) : (
                        <Eye className="yypay:h-4 yypay:w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="yypay:w-full" disabled={loading}>
                  {loading && (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  )}
                  {t.login.continueCta}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMfa} className="yypay:space-y-4">
                <div className="yypay:space-y-2">
                  <Label htmlFor="mfa">{t.login.mfaCodeLabel}</Label>
                  <Input
                    id="mfa"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="yypay:w-full" disabled={loading}>
                  {loading && (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  )}
                  {t.login.verifyCodeCta}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="yypay:w-full"
                  onClick={() => router.push(tenantsPath())}
                >
                  {t.login.backToTenant}
                </Button>
              </form>
            )}
            <p className="yypay:mt-6 yypay:text-center yypay:text-xs yypay:text-secondary">
              {t.login.delegatedAuthNote}
            </p>
            <p className="yypay:mt-2 yypay:text-center yypay:text-xs yypay:text-primary">
              <Link href="/" className="yypay:hover:text-primary">
                {t.login.backHome}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
