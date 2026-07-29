"use client";

import { LanguageToggle } from "@/components/language/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { ChevronRight, Menu, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type SiteHeaderProps = {
  showLogin?: boolean;
};

export function SiteHeader({ showLogin = true }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const navItems = [
    { href: "/#accueil", label: t.siteHeader.nav.home },
    { href: "/#documentation", label: t.siteHeader.nav.documentation },
    { href: "/#tarifs", label: t.siteHeader.nav.pricing },
  ];

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

        <nav className="yypay:hidden yypay:items-center yypay:gap-8 md:yypay:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="yypay:text-sm yypay:font-medium yypay:text-muted-foreground hover:yypay:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="yypay:flex yypay:items-center yypay:gap-1 sm:yypay:gap-2">
          <LanguageToggle />
          <ThemeToggle />

          <div className="yypay:hidden yypay:items-center yypay:gap-2 md:yypay:flex">
            {showLogin && (
              <Button asChild size="sm">
                <Link href="/login">{t.siteHeader.login}</Link>
              </Button>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:yypay:hidden">
              <Button variant="ghost" size="icon" aria-label={t.siteHeader.menu}>
                <Menu className="yypay:h-5 yypay:w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="md:yypay:hidden yypay:w-full yypay:max-w-sm yypay:gap-0 yypay:p-0"
            >
              <SheetHeader className="yypay:border-b yypay:border-border yypay:px-6 yypay:py-5 yypay:pr-14">
                <SheetTitle>{t.siteHeader.menu}</SheetTitle>
              </SheetHeader>

              <nav className="yypay:flex yypay:flex-1 yypay:flex-col yypay:gap-1 yypay:px-4 yypay:py-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "yypay:flex yypay:items-center yypay:justify-between yypay:rounded-lg yypay:px-4 yypay:py-3.5",
                      "yypay:text-base yypay:font-medium yypay:text-foreground",
                      "hover:yypay:bg-muted active:yypay:bg-muted",
                    )}
                  >
                    {item.label}
                    <ChevronRight
                      className="yypay:h-4 yypay:w-4 yypay:text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                ))}

                <div className="yypay:mt-4 yypay:flex yypay:items-center yypay:justify-between yypay:rounded-lg yypay:border yypay:border-border yypay:px-4 yypay:py-3">
                  <span className="yypay:text-sm yypay:font-medium">{t.siteHeader.theme}</span>
                  <ThemeToggle />
                </div>

                {showLogin && (
                  <>
                    <Separator className="yypay:my-4" />
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "yypay:inline-flex yypay:h-11 yypay:items-center yypay:justify-center",
                        "yypay:rounded-lg yypay:bg-primary yypay:px-4",
                        "yypay:text-sm yypay:font-medium yypay:text-primary-foreground",
                        "hover:yypay:bg-primary/90",
                      )}
                    >
                      {t.siteHeader.login}
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
