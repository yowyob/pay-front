import type { Locale } from "@/i18n/locale-provider";

export function toIntlTag(locale: Locale): string {
  return locale === "en" ? "en-US" : "fr-FR";
}
