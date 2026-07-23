/**
 * URL de connexion externe (YowAuth). L'authentification n'est plus assurée par le front de
 * paiement : « Se connecter » redirige vers ce portail. Surchargeable par `NEXT_PUBLIC_YOWAUTH_URL`.
 */
export const YOWAUTH_LOGIN_URL =
  process.env.NEXT_PUBLIC_YOWAUTH_URL ?? "https://yowauth.yowyob.com";
