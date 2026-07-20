import type { components } from "@/types/schemas-payment";
import { create } from "zustand";

type CommercialPlanResponse = components["schemas"]["CommercialPlanResponse"];

export type CartPlanItem = {
  plan: CommercialPlanResponse;
  addOnCodes: string[];
};

type CartState = {
  items: CartPlanItem[];
  addPlan: (plan: CommercialPlanResponse, addOnCodes?: string[]) => void;
  removePlan: (code: string) => void;
  setPlanAddOns: (code: string, addOnCodes: string[]) => void;
  togglePlanAddOn: (code: string, addOnCode: string) => void;
  clearCart: () => void;
  itemCount: () => number;
  hasPlan: (code: string) => boolean;
  getAddOnCodesByPlan: () => Record<string, string[]>;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addPlan: (plan, addOnCodes = []) => {
    if (!plan.code || get().items.some((item) => item.plan.code === plan.code)) {
      return;
    }
    set((state) => ({
      items: [...state.items, { plan, addOnCodes }],
    }));
  },
  removePlan: (code) => {
    set((state) => ({
      items: state.items.filter((item) => item.plan.code !== code),
    }));
  },
  setPlanAddOns: (code, addOnCodes) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.plan.code === code ? { ...item, addOnCodes } : item,
      ),
    }));
  },
  togglePlanAddOn: (code, addOnCode) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.plan.code !== code) {
          return item;
        }
        const hasAddOn = item.addOnCodes.includes(addOnCode);
        return {
          ...item,
          addOnCodes: hasAddOn
            ? item.addOnCodes.filter((value) => value !== addOnCode)
            : [...item.addOnCodes, addOnCode],
        };
      }),
    }));
  },
  clearCart: () => set({ items: [] }),
  itemCount: () => get().items.length,
  hasPlan: (code) => get().items.some((item) => item.plan.code === code),
  getAddOnCodesByPlan: () =>
    Object.fromEntries(
      get()
        .items.filter((item) => item.plan.code)
        .map((item) => [item.plan.code as string, item.addOnCodes]),
    ),
}));
