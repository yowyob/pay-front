"use client";

import { LanguageToggle } from "@/components/language/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { YOWAUTH_SIGNUP_URL } from "@/lib/external-auth";
import { Wallet } from "lucide-react";
import Link from "next/link";

type SiteHeaderProps = {
  showLogin?: boolean;
};

export function SiteHeader({ showLogin = true }: SiteHeaderProps) {
  return (
    <header className="yypay:sticky yypay:top-0 yypay:z-40 yypay:border-b yypay:border-border yypay:bg-card/90 yypay:backdrop-blur">
      <div className="yypay:mx-auto yypay:flex yypay:h-16 yypay:max-w-6xl yypay:items-center yypay:justify-between yypay:gap-3 yypay:px-4 sm:yypay:px-6">
        <Link
          href="/"
          className="yypay:flex yypay:min-w-0 yypay:items-center yypay:gap-2 yypay:text-foreground"
        >
          <span className="yypay:flex yypay:h-9 yypay:w-9 yypay:shrink-0 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-primary yypay:text-primary-foreground">
            <Wallet className="yypay:h-5 yypay:w-5" />
          </span>
          <span className="yypay:truncate yypay:text-base yypay:font-semibold sm:yypay:text-lg">
            YowYob Payment
          </span>
        </Link>

        <div className="yypay:flex yypay:items-center yypay:gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {showLogin && (
            <>
              <Button asChild size="sm" variant="outline">
                <a href={YOWAUTH_SIGNUP_URL}>S&apos;inscrire</a>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Se connecter</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
