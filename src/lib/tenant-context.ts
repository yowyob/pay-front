import type { components } from "@/types/schemas-auth";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];
type DiscoveredLoginContextResponse =
  components["schemas"]["DiscoveredLoginContextResponse"];

export type TenantOption = {
  tenantId: string;
  contextId: string;
  organizationCount: number;
  label: string;
  subtitle?: string;
};

/** Le noyau renvoie un nom lisible (label) et un type (kind) ; les types générés ne les ont pas encore. */
type LabelledContext = DiscoveredLoginContextResponse & { label?: string; kind?: string };

const KIND_LABELS: Record<string, string> = {
  PLATFORM: "Plateforme",
  OWN_SPACE: "Mon espace",
  SHARED_SPACE: "Espace partagé",
};

function buildTenantLabel(context: DiscoveredLoginContextResponse): string {
  const named = (context as LabelledContext).label?.trim();
  if (named) {
    return named;
  }
  const firstOrg = context.organizations?.[0];
  if (firstOrg?.displayName?.trim()) {
    return firstOrg.displayName;
  }
  if (firstOrg?.longName?.trim()) {
    return firstOrg.longName;
  }
  if (firstOrg?.organizationCode?.trim()) {
    return firstOrg.organizationCode;
  }
  // Jamais d'identifiant à l'écran : à défaut de nom, le type d'espace.
  const kind = (context as LabelledContext).kind;
  return (kind && KIND_LABELS[kind]) || "Espace sans nom";
}

export function mapDiscoverToTenantOptions(
  data: DiscoverLoginContextsResponse | undefined,
): TenantOption[] {
  const seen = new Map<string, TenantOption>();

  for (const context of data?.contexts ?? []) {
    if (!context.tenantId || !context.contextId) {
      continue;
    }

    const organizationCount = context.organizations?.length ?? 0;
    const label = buildTenantLabel(context);
    const subtitle =
      organizationCount > 1
        ? `${organizationCount} organisations`
        : context.organizations?.[0]?.organizationCode;

    seen.set(context.tenantId, {
      tenantId: context.tenantId,
      contextId: context.contextId,
      organizationCount,
      label,
      subtitle,
    });
  }

  return Array.from(seen.values());
}

export function getOrganizationsForContext(
  data: DiscoverLoginContextsResponse | undefined,
  contextId: string,
) {
  const context = data?.contexts?.find((item) => item.contextId === contextId);
  return context?.organizations ?? [];
}
