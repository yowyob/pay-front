"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";
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
  const { t } = useLocale();
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
        aria-label={t.theme.toggle}
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
      aria-label={isDark ? t.theme.toggleToLight : t.theme.toggleToDark}
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
