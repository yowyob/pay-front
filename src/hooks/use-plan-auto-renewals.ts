"use client";

import { bffDelete, bffGet, bffPost } from "@/lib/bff-client";
import type { BillingPeriod } from "@/lib/commercial-plan-display";
import type { components } from "@/types/schemas-payment";
import { useCallback, useState } from "react";

type AutoRenewalResponse = components["schemas"]["AutoRenewalResponse"];

type EnableAutoRenewalOptions = {
  billingPeriod: BillingPeriod;
  addOnCodes?: string[];
  organizationId?: string;
};

export function usePlanAutoRenewals() {
  const [renewalsByPlanCode, setRenewalsByPlanCode] = useState<
    Record<string, AutoRenewalResponse>
  >({});
  const [loading, setLoading] = useState(true);
  const [mutatingPlanCode, setMutatingPlanCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const renewals = await bffGet<AutoRenewalResponse[]>(
        "/api/plans/auto-renewals",
      );
      const entries = (Array.isArray(renewals) ? renewals : [])
        .filter((renewal) => renewal.planCode)
        .map((renewal) => [renewal.planCode as string, renewal] as const);
      setRenewalsByPlanCode(Object.fromEntries(entries));
    } catch {
      setRenewalsByPlanCode({});
    } finally {
      setLoading(false);
    }
  }, []);

  const enable = useCallback(
    async (planCode: string, options: EnableAutoRenewalOptions) => {
      setMutatingPlanCode(planCode);
      try {
        const renewal = await bffPost<AutoRenewalResponse>(
          `/api/plans/${planCode}/auto-renewal`,
          {
            organizationId: options.organizationId,
            billingPeriod: options.billingPeriod,
            addOnCodes: options.addOnCodes ?? [],
            provider: "MYCOOLPAY",
            method: "MOBILE_MONEY",
          },
        );
        setRenewalsByPlanCode((current) => ({
          ...current,
          [planCode]: renewal,
        }));
        return renewal;
      } finally {
        setMutatingPlanCode(null);
      }
    },
    [],
  );

  const disable = useCallback(async (planCode: string) => {
    setMutatingPlanCode(planCode);
    try {
      const renewal = await bffDelete<AutoRenewalResponse>(
        `/api/plans/${planCode}/auto-renewal`,
      );
      setRenewalsByPlanCode((current) => ({
        ...current,
        [planCode]: renewal,
      }));
      return renewal;
    } finally {
      setMutatingPlanCode(null);
    }
  }, []);

  return {
    renewalsByPlanCode,
    loading,
    mutatingPlanCode,
    reload: load,
    enable,
    disable,
  };
}
