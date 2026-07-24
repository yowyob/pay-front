"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "fr" ? "en" : "fr";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("yypay:shrink-0 yypay:gap-1.5 yypay:px-2", className)}
      aria-label={t.language.switchLabel}
      onClick={() => setLocale(next)}
    >
      <Languages className="yypay:h-4 yypay:w-4" />
      <span className="yypay:text-xs yypay:font-semibold yypay:uppercase">
        {locale}
      </span>
    </Button>
  );
}
