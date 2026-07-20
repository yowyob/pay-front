"use client";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}

export function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}
