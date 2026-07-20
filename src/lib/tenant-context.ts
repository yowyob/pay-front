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

function shortTenantId(tenantId: string): string {
  return tenantId.length > 8 ? `${tenantId.slice(0, 8)}…` : tenantId;
}

function buildTenantLabel(context: DiscoveredLoginContextResponse): string {
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
  if (context.tenantId) {
    return `Tenant ${shortTenantId(context.tenantId)}`;
  }
  return "Tenant";
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
