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
import { bffGet, bffPost, bffPostEnvelope } from "@/lib/bff-client";
import { performLogin } from "@/lib/auth-login-flow";
import {
  consolePath,
  hardNavigate,
  mfaPath as buildMfaPath,
} from "@/lib/auth-wizard-navigation";
import { getOrganizationsForContext } from "@/lib/tenant-context";
import { useAuthWizardStore } from "@/stores/auth-wizard-store";
import type { components } from "@/types/schemas-auth";
import { Building2, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];
type UserMembershipResponse = components["schemas"]["UserMembershipResponse"];

type OrgOption = {
  organizationId: string;
  organizationCode?: string;
  displayName?: string;
  longName?: string;
  services?: string[];
  contextId?: string;
  selectionToken?: string;
};

function mapMembershipsToOrgs(
  memberships: UserMembershipResponse[],
): OrgOption[] {
  const grouped = new Map<string, OrgOption>();

  for (const membership of memberships) {
    if (!membership.organizationId) continue;

    const existing = grouped.get(membership.organizationId);
    const badges = [
      ...(existing?.services ?? []),
      membership.roleName,
      ...(membership.permissions ?? []),
    ].filter((value): value is string => Boolean(value));

    grouped.set(membership.organizationId, {
      organizationId: membership.organizationId,
      organizationCode: membership.organizationCode,
      displayName: membership.organizationName,
      longName: membership.organizationName,
      services: [...new Set(badges)],
    });
  }

  return Array.from(grouped.values());
}

export default function OrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="yypay:flex yypay:min-h-full yypay:items-center yypay:justify-center yypay:bg-background">
          <Loader2 className="yypay:h-8 yypay:w-8 yypay:animate-spin yypay:text-primary" />
        </div>
      }
    >
      <OrganizationsPageContent />
    </Suspense>
  );
}

function OrganizationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const {
    email,
    password,
    hasCredentials,
    discoverData,
    selectedContextId,
    selectionToken,
    setSelectionToken,
    setDiscoverData,
    setMfaToken,
    clearSensitive,
  } = useAuthWizardStore();
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  useEffect(() => {
    function mapContextOrganizations(
      data: DiscoverLoginContextsResponse,
      contextId: string,
    ): OrgOption[] {
      const organizations = getOrganizationsForContext(data, contextId);
      return organizations
        .filter((org): org is typeof org & { organizationId: string } =>
          Boolean(org.organizationId),
        )
        .map((org) => ({
          organizationId: org.organizationId,
          organizationCode: org.organizationCode,
          displayName: org.displayName,
          longName: org.longName,
          services: org.services,
          contextId,
          selectionToken: data.selectionToken,
        }));
    }

    async function loadFromDiscoverContexts(): Promise<OrgOption[] | null> {
      if (discoverData?.selectionToken && selectedContextId) {
        const fromStore = mapContextOrganizations(
          discoverData,
          selectedContextId,
        );
        if (fromStore.length > 0) {
          return fromStore;
        }
      }

      if (!hasCredentials()) {
        return null;
      }

      const result = await bffPostEnvelope<DiscoverLoginContextsResponse>(
        "/api/auth/discover-contexts",
        { principal: email, password },
      );
      const data = result.data;
      if (!data?.selectionToken) {
        throw new Error("Impossible de récupérer les organisations");
      }

      setDiscoverData(data);
      setSelectionToken(data.selectionToken);

      const contextId =
        selectedContextId ||
        data.contexts?.find((context) => context.contextId)?.contextId;
      if (!contextId) {
        return null;
      }

      const discovered = mapContextOrganizations(data, contextId);
      return discovered.length > 0 ? discovered : null;
    }

    async function loadFromMemberships(): Promise<OrgOption[] | null> {
      const memberships = await bffGet<UserMembershipResponse[]>(
        "/api/auth/me/memberships",
      );
      if (!Array.isArray(memberships)) {
        return null;
      }

      const mapped = mapMembershipsToOrgs(memberships);
      return mapped.length > 0 ? mapped : null;
    }

    async function loadOrganizations() {
      try {
        // Après connexion, discover-contexts est la source fiable (contextId + selectionToken).
        const discovered = await loadFromDiscoverContexts();
        if (discovered) {
          setOrgs(discovered);
          return;
        }

        try {
          const fromMemberships = await loadFromMemberships();
          if (fromMemberships) {
            setOrgs(fromMemberships);
            return;
          }
        } catch {
          // Session expirée ou memberships indisponibles.
        }

        if (!hasCredentials() && !discoverData?.selectionToken) {
          toast.error("Session expirée, reconnectez-vous");
          router.replace("/login");
          return;
        }

        toast.error("Aucune organisation disponible pour ce compte");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors du chargement des organisations",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrganizations();
  }, [
    email,
    password,
    hasCredentials,
    router,
    discoverData,
    selectedContextId,
    setDiscoverData,
    setSelectionToken,
  ]);

  const uniqueOrgs = useMemo(() => {
    const map = new Map<string, OrgOption>();
    for (const org of orgs) {
      map.set(org.organizationId, org);
    }
    return Array.from(map.values());
  }, [orgs]);

  async function resolveSelectionContext(org: OrgOption) {
    if (org.selectionToken && org.contextId) {
      return {
        selectionToken: org.selectionToken,
        contextId: org.contextId,
      };
    }

    if (selectionToken && selectedContextId) {
      return {
        selectionToken,
        contextId: selectedContextId,
      };
    }

    if (!hasCredentials()) {
      throw new Error("Session expirée, reconnectez-vous");
    }

    const result = await bffPostEnvelope<DiscoverLoginContextsResponse>(
      "/api/auth/discover-contexts",
      { principal: email, password },
    );
    const data = result.data;
    if (!data?.selectionToken) {
      throw new Error("Impossible de récupérer les organisations");
    }

    setSelectionToken(data.selectionToken);

    const matchingContext = data.contexts?.find((context) =>
      context.organizations?.some(
        (item) => item.organizationId === org.organizationId,
      ),
    );
    const contextId = matchingContext?.contextId;
    if (!contextId) {
      throw new Error("Contexte introuvable pour cette organisation");
    }

    return {
      selectionToken: data.selectionToken,
      contextId,
    };
  }

  async function handleSelect(org: OrgOption) {
    setSelecting(org.organizationId);
    try {
      const session = await bffGet<{ authenticated?: boolean }>(
        "/api/session/context",
      );

      if (!session.authenticated && hasCredentials()) {
        const loginResult = await performLogin(email, password);
        if (loginResult.kind === "mfa_required") {
          setMfaToken(loginResult.mfaToken);
          toast.success("Code MFA envoyé par email");
          hardNavigate(buildMfaPath(returnTo));
          return;
        }
      }

      const { selectionToken, contextId } = await resolveSelectionContext(org);

      await bffPost("/api/auth/select-context", {
        selectionToken,
        contextId,
        organizationId: org.organizationId,
      });
      clearSensitive();
      toast.success("Organisation sélectionnée");
      hardNavigate(consolePath(returnTo));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de sélectionner cette organisation",
      );
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="yypay:flex yypay:min-h-full yypay:flex-col yypay:bg-background">
      <ConsoleHeader title="Choisir une organisation" />
      <main className="yypay:mx-auto yypay:w-full yypay:max-w-6xl yypay:flex-1 yypay:px-4 yypay:py-8 sm:yypay:px-6">
        <div className="yypay:mb-8">
          <h1 className="yypay:text-2xl yypay:font-bold yypay:text-foreground sm:yypay:text-3xl">
            Vos organisations
          </h1>
          <p className="yypay:mt-2 yypay:text-muted-foreground">
            Sélectionnez l&apos;organisation que vous souhaitez gérer.
          </p>
        </div>

        {loading && (
          <div className="yypay:grid yypay:grid-cols-1 yypay:gap-4 md:yypay:grid-cols-2 lg:yypay:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="yypay:h-40" />
            ))}
          </div>
        )}

        {!loading && uniqueOrgs.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aucune organisation</CardTitle>
              <CardDescription>
                Aucune organisation n&apos;est disponible pour ce compte.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="yypay:grid yypay:grid-cols-1 yypay:gap-4 md:yypay:grid-cols-2 lg:yypay:grid-cols-3">
          {uniqueOrgs.map((org) => (
            <Card key={org.organizationId} className="yypay:flex yypay:flex-col">
              <CardHeader>
                <div className="yypay:flex yypay:items-start yypay:justify-between yypay:gap-2">
                  <div className="yypay:flex yypay:items-center yypay:gap-2">
                    <Building2 className="yypay:h-5 yypay:w-5 yypay:text-primary" />
                    <CardTitle className="yypay:text-lg">
                      {org.displayName ?? org.longName ?? org.organizationCode}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription>{org.organizationCode}</CardDescription>
              </CardHeader>
              <CardContent className="yypay:mt-auto yypay:space-y-4">
                <div className="yypay:flex yypay:flex-wrap yypay:gap-2">
                  {(org.services ?? []).map((service) => (
                    <Badge key={service} variant="secondary">
                      {service}
                    </Badge>
                  ))}
                </div>
                <Button
                  className="yypay:w-full"
                  onClick={() => handleSelect(org)}
                  disabled={selecting === org.organizationId}
                >
                  {selecting === org.organizationId && (
                    <Loader2 className="yypay:h-4 yypay:w-4 yypay:animate-spin" />
                  )}
                  Gérer cette organisation
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
