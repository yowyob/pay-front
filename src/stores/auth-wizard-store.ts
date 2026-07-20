import { create } from "zustand";

type AuthWizardState = {
  email: string;
  password: string;
  mfaToken: string;
  selectionToken: string;
  setCredentials: (email: string, password: string) => void;
  setMfaToken: (mfaToken: string) => void;
  setSelectionToken: (selectionToken: string) => void;
  clearSensitive: () => void;
  hasCredentials: () => boolean;
};

export const useAuthWizardStore = create<AuthWizardState>((set, get) => ({
  email: "",
  password: "",
  mfaToken: "",
  selectionToken: "",
  setCredentials: (email, password) => set({ email, password }),
  setMfaToken: (mfaToken) => set({ mfaToken }),
  setSelectionToken: (selectionToken) => set({ selectionToken }),
  clearSensitive: () => set({ password: "", mfaToken: "", selectionToken: "" }),
  hasCredentials: () => Boolean(get().email && get().password),
}));
