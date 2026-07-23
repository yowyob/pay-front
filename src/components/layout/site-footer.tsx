import { Wallet } from "lucide-react";
import Link from "next/link";

const YEAR = new Date().getFullYear();

const LINKS: { label: string; href: string }[] = [
  { label: "Comment ça marche", href: "/#comment-ca-marche" },
  { label: "Sécurité", href: "/#benchmark" },
  { label: "Se connecter", href: "/login" },
];

/**
 * Pied de page public, aligné sur le reste des fronts Yowyob : marque à gauche,
 * quelques liens de navigation, mention légale discrète.
 */
export function SiteFooter() {
  return (
    <footer className="yypay:border-t yypay:border-border yypay:bg-card">
      <div className="yypay:mx-auto yypay:flex yypay:max-w-6xl yypay:flex-col yypay:gap-6 yypay:px-4 yypay:py-10 sm:yypay:px-6 md:yypay:flex-row md:yypay:items-center md:yypay:justify-between">
        <div className="yypay:flex yypay:items-center yypay:gap-2 yypay:text-foreground">
          <span className="yypay:flex yypay:h-8 yypay:w-8 yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-primary yypay:text-primary-foreground">
            <Wallet className="yypay:h-4 yypay:w-4" />
          </span>
          <span className="yypay:text-sm yypay:font-semibold">
            YowYob Payment
          </span>
        </div>

        <nav className="yypay:flex yypay:flex-wrap yypay:items-center yypay:gap-x-6 yypay:gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="yypay:text-sm yypay:text-muted-foreground yypay:transition-colors hover:yypay:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="yypay:border-t yypay:border-border">
        <div className="yypay:mx-auto yypay:max-w-6xl yypay:px-4 yypay:py-4 sm:yypay:px-6">
          <p className="yypay:text-xs yypay:text-muted-foreground">
            © {YEAR} YowYob. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
