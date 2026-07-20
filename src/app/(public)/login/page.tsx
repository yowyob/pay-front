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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
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
        throw new Error("Identifiants invalides ou aucun tenant disponible");
      }

      setCredentials(principal, secret);
      setSelectionToken(data.selectionToken);
      setDiscoverData(data);
      toast.success("Identifiants validés — choisissez votre tenant");
      hardNavigate(tenantsPath());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec de la connexion",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await bffPostEnvelope("/api/auth/login/mfa/confirm", {
        mfaToken: mfaToken || useAuthWizardStore.getState().mfaToken,
        code,
      });
      toast.success("Authentification réussie");
      hardNavigate(organizationsPath());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Code MFA invalide",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <SiteHeader />
      <main className="yypay:flex yypay:flex-1 yypay:items-center yypay:justify-center yypay:px-4 yypay:py-10">
        <Card className="yypay:w-full yypay:max-w-lg yypay:shadow-md">
          <CardHeader className="yypay:pb-2">
            <Tabs value="login">
              <TabsList className="yypay:grid yypay:w-full yypay:grid-cols-2">
                <TabsTrigger value="login">Se connecter</TabsTrigger>
                <TabsTrigger value="signup" disabled>
                  Créer un compte
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="yypay:mt-6">
                {step === "credentials" ? (
                  <>
                    <CardTitle className="yypay:text-2xl">Bon retour.</CardTitle>
                    <CardDescription>
                      Connectez-vous pour accéder à votre console.
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <CardTitle className="yypay:text-2xl">
                      Vérification MFA
                    </CardTitle>
                    <CardDescription>
                      Saisissez le code reçu par email.
                    </CardDescription>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
              <form onSubmit={handleLogin} className="yypay:space-y-4">
                <div className="yypay:space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple : vous@domaine.com"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                  />
                </div>
                <div className="yypay:space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="yypay:relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Entrez votre mot de passe"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required
                      className="yypay:pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="yypay:absolute yypay:right-3 yypay:top-1/2 yypay:-translate-y-1/2 yypay:text-secondary"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
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
                  Continuer
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMfa} className="yypay:space-y-4">
                <div className="yypay:space-y-2">
                  <Label htmlFor="mfa">Code MFA</Label>
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
                  Vérifier le code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="yypay:w-full"
                  onClick={() => router.push(tenantsPath())}
                >
                  Retour au choix du tenant
                </Button>
              </form>
            )}
            <p className="yypay:mt-6 yypay:text-center yypay:text-xs yypay:text-secondary">
              Connexion déléguée au Kernel — aucun mot de passe n&apos;est
              stocké.
            </p>
            <p className="yypay:mt-2 yypay:text-center yypay:text-xs yypay:text-primary">
              <Link href="/" className="hover:yypay:text-primary">
                Retour à l&apos;accueil
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
