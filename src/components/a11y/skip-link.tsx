"use client";

import { useLocale } from "@/i18n/locale-provider";

/** Premier arrêt de la touche Tab : saute l'en-tête et mène à la zone principale (#contenu). */
export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#contenu"
      className="yypay:sr-only yypay:focus:not-sr-only yypay:focus:fixed yypay:focus:left-4 yypay:focus:top-4 yypay:focus:z-[100] yypay:focus:rounded-md yypay:focus:bg-card yypay:focus:px-4 yypay:focus:py-2 yypay:focus:text-sm yypay:focus:font-medium yypay:focus:text-foreground yypay:focus:shadow-lg"
    >
      {t.common.skipToContent}
    </a>
  );
}
