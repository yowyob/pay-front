import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { components } from "@/types/schemas-auth";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];

type AuthWizardState = {
  email: string;
  password: string;
  mfaToken: string;
  selectionToken: string;
  discoverData: DiscoverLoginContextsResponse | null;
  selectedContextId: string;
  selectedTenantId: string;
  setCredentials: (email: string, password: string) => void;
  setMfaToken: (mfaToken: string) => void;
  setSelectionToken: (selectionToken: string) => void;
  setDiscoverData: (data: DiscoverLoginContextsResponse | null) => void;
  setSelectedContext: (contextId: string, tenantId: string) => void;
  clearSensitive: () => void;
  hasCredentials: () => boolean;
};

export const useAuthWizardStore = create<AuthWizardState>()(
  persist(
    (set, get) => ({
      email: "",
      password: "",
      mfaToken: "",
      selectionToken: "",
      discoverData: null,
      selectedContextId: "",
      selectedTenantId: "",
      setCredentials: (email, password) => set({ email, password }),
      setMfaToken: (mfaToken) => set({ mfaToken }),
      setSelectionToken: (selectionToken) => set({ selectionToken }),
      setDiscoverData: (discoverData) => set({ discoverData }),
      setSelectedContext: (selectedContextId, selectedTenantId) =>
        set({ selectedContextId, selectedTenantId }),
      clearSensitive: () =>
        set({
          password: "",
          mfaToken: "",
          selectionToken: "",
          discoverData: null,
          selectedContextId: "",
          selectedTenantId: "",
        }),
      hasCredentials: () => Boolean(get().email && get().password),
    }),
    {
      name: "yy-pay-auth-wizard",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        email: state.email,
        password: state.password,
        mfaToken: state.mfaToken,
        selectionToken: state.selectionToken,
        discoverData: state.discoverData,
        selectedContextId: state.selectedContextId,
        selectedTenantId: state.selectedTenantId,
      }),
    },
  ),
);
