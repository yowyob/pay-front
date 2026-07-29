"use client";

import { ConsoleHeader } from "@/components/layout/console-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale-provider";
import { performLogin } from "@/lib/auth-login-flow";
import {
    mfaPath as buildMfaPath,
    organizationsPath as buildOrganizationsPath,
    hardNavigate,
} from "@/lib/auth-wizard-navigation";
import { bffPost, bffPostEnvelope } from "@/lib/bff-client";
import {
    mapDiscoverToTenantOptions,
    type TenantOption,
} from "@/lib/tenant-context";
import { useAuthWizardStore } from "@/stores/auth-wizard-store";
import type { components } from "@/types/schemas-auth";
import { Building2, Loader2, Server } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];

export default function TenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center yypay:bg-background">
          <Loader2 className="yypay:h-8 yypay:w-8 yypay:animate-spin yypay:text-primary" />
        </div>
      }
    >
      <TenantsPageContent />
    </Suspense>
  );
}

function TenantsPageContent() {
  const router = useRouter();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const {
    email,
    password,
    hasCredentials,
    discoverData,
    setDiscoverData,
    setSelectionToken,
    setSelectedContext,
    setMfaToken,
  } = useAuthWizardStore();
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);

  async function authenticateAfterTenantSelection() {
    const loginResult = await performLogin(email, password, t);
    if (loginResult.kind === "authenticated") {
      toast.success(t.login.authSuccess);
      hardNavigate(buildOrganizationsPath(returnTo));
      return;
    }

    setMfaToken(loginResult.mfaToken);
    toast.success(t.auth.mfaCodeSent);
    hardNavigate(buildMfaPath(returnTo));
  }

  async function selectTenant(option: TenantOption, selectionToken?: string) {
    setSelecting(option.tenantId);
    try {
      await bffPost("/api/auth/select-tenant", {
        tenantId: option.tenantId,
        contextId: option.contextId,
      });
      setSelectedContext(option.contextId, option.tenantId);
      if (selectionToken) {
        setSelectionToken(selectionToken);
      }
      await authenticateAfterTenantSelection();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.tenants.selectError,
      );
      setSelecting(null);
    }
  }

  useEffect(() => {
    async function loadTenants() {
      if (!hasCredentials()) {
        toast.error(t.auth.sessionExpired);
        router.replace("/login");
        return;
      }

      try {
        let resolvedData = discoverData;
        if (!resolvedData?.selectionToken) {
          const result = await bffPostEnvelope<DiscoverLoginContextsResponse>(
            "/api/auth/discover-contexts",
            { principal: email, password },
          );
          resolvedData = result.data ?? null;
          if (!resolvedData?.selectionToken) {
            throw new Error(t.tenants.loadError);
          }
          setSelectionToken(resolvedData.selectionToken);
          setDiscoverData(resolvedData);
        }

        const options = mapDiscoverToTenantOptions(resolvedData);
        if (options.length === 0) {
          toast.error(t.tenants.noneAvailable);
          return;
        }

        if (options.length === 1) {
          await selectTenant(options[0], resolvedData.selectionToken);
          return;
        }

        setTenants(options);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t.tenants.loadGenericError,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadTenants();
    // selectTenant est volontairement hors des deps pour éviter une boucle au chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    email,
    password,
    hasCredentials,
    router,
    discoverData,
    setDiscoverData,
    setSelectionToken,
  ]);

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <ConsoleHeader title={t.tenants.headerTitle} />
      <main className="yypay:mx-auto yypay:w-full yypay:max-w-6xl yypay:flex-1 yypay:px-4 yypay:py-8 sm:yypay:px-6">
        <div className="yypay:mb-8">
          <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
            {t.tenants.title}
          </h1>
          <p className="yypay:mt-2 yypay:text-muted-foreground">
            {t.tenants.descriptionPrefix} <code>X-Tenant-Id</code>{" "}
            {t.tenants.descriptionSuffix}
          </p>
        </div>

        {loading && (
          <div className="yypay:grid yypay:grid-cols-1 yypay:gap-4 md:yypay:grid-cols-2 lg:yypay:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="yypay:h-40" />
            ))}
          </div>
        )}

        {!loading && tenants.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.tenants.emptyTitle}</CardTitle>
              <CardDescription>
                {t.tenants.emptyDescription}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="yypay:grid yypay:grid-cols-1 yypay:gap-4 md:yypay:grid-cols-2 lg:yypay:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.tenantId} className="yypay:flex yypay:flex-col">
              <CardHeader>
                <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-2">
                  <div className="yypay:flex yypay:items-center yypay:gap-2">
                    <Server className="yypay:h-5 yypay:w-5 yypay:text-primary" />
                    <CardTitle className="yypay:text-lg">{tenant.label}</CardTitle>
                  </div>
                </div>
                <CardDescription className="yypay:break-all">
                  {tenant.tenantId}
                </CardDescription>
              </CardHeader>
              <CardContent className="yypay:mt-auto yypay:space-y-4">
                <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
                  <Badge variant="secondary">
                    <Building2 className="yypay:mr-1 yypay:h-3 yypay:w-3" />
                    {tenant.organizationCount} {t.tenants.orgCountSuffix}
                  </Badge>
                  {tenant.subtitle && (
                    <Badge variant="secondary">{tenant.subtitle}</Badge>
                  )}
                </div>
                <Button
                  className="yypay:w-full"
                  onClick={() => selectTenant(tenant)}
                  disabled={selecting === tenant.tenantId}
                >
                  {selecting === tenant.tenantId && (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  )}
                  {t.tenants.useCta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
