/**
 * URL d'INSCRIPTION externe (YowAuth). La connexion (« Se connecter ») se fait ICI, sur le front de
 * paiement (page /login). Seule l'inscription (« S'inscrire ») est déléguée à ce portail.
 * Surchargeable par `NEXT_PUBLIC_YOWAUTH_URL`.
 */
export const YOWAUTH_SIGNUP_URL =
  process.env.NEXT_PUBLIC_YOWAUTH_URL ?? "https://yowauth.yowyob.com";
