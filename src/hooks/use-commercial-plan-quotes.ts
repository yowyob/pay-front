"use client";

import { bffPost } from "@/lib/bff-client";
import type { BillingPeriod } from "@/lib/commercial-plan-display";
import type { components } from "@/types/schemas-payment";
import { useEffect, useState } from "react";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];
type CommercialPlanQuoteResponse =
  components["schemas"]["CommercialPlanQuoteResponse"];

export function useCommercialPlanQuotes(
  plans: CommercialPlanResponse[],
  billingPeriod: BillingPeriod,
  addOnCodesByPlan: Record<string, string[]> = {},
) {
  const [quotes, setQuotes] = useState<
    Record<string, CommercialPlanQuoteResponse>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planCodes = plans
    .map((plan) => plan.code)
    .filter((code): code is string => Boolean(code))
    .join(",");
  const addOnsKey = JSON.stringify(addOnCodesByPlan);

  useEffect(() => {
    let cancelled = false;

    if (!planCodes) {
      const timer = globalThis.setTimeout(() => {
        if (!cancelled) {
          setQuotes({});
          setLoading(false);
          setError(null);
        }
      }, 0);
      return () => {
        cancelled = true;
        globalThis.clearTimeout(timer);
      };
    }

    const codes = planCodes.split(",");
    const timer = globalThis.setTimeout(() => {
      setLoading(true);
      setError(null);

      void Promise.all(
        codes.map(async (code) => {
          const quote = await bffPost<CommercialPlanQuoteResponse>(
            `/api/plans/${code}/quote`,
            {
              billingPeriod,
              addOnCodes: addOnCodesByPlan[code] ?? [],
            },
          );
          return [code, quote] as const;
        }),
      )
        .then((entries) => {
          if (!cancelled) {
            setQuotes(Object.fromEntries(entries));
          }
        })
        .catch((quoteError) => {
          if (!cancelled) {
            setQuotes({});
            setError(
              quoteError instanceof Error
                ? quoteError.message
                : "Impossible de charger les tarifs",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [planCodes, billingPeriod, addOnsKey, addOnCodesByPlan]);

  return { quotes, loading, error };
}
