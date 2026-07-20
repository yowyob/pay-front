"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

type ThemeToggleProps = {
  className?: string;
};

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("yypay:shrink-0", className)}
        aria-label="Changer le thème"
        disabled
      >
        <Sun className="yypay:h-4 yypay:w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("yypay:shrink-0", className)}
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="yypay:h-4 yypay:w-4" />
      ) : (
        <Moon className="yypay:h-4 yypay:w-4" />
      )}
    </Button>
  );
}
