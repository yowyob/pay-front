import { bffPostEnvelope } from "@/lib/bff-client";

type LoginChallengeData = {
  mfaToken?: string;
  requiresMfa?: boolean;
  accessToken?: string;
  sessionToken?: string;
};

export type LoginFlowResult =
  | { kind: "authenticated" }
  | { kind: "mfa_required"; mfaToken: string };

export async function performLogin(
  principal: string,
  password: string,
  tenantId?: string,
): Promise<LoginFlowResult> {
  const result = await bffPostEnvelope<LoginChallengeData>("/api/auth/login", {
    principal,
    password,
    // Transmis explicitement : dans le flux popup + redirect (MyCoolPay), le cookie de tenant posé
    // par select-context ne se propage pas toujours au login. On garantit ainsi le tenant sélectionné.
    ...(tenantId ? { tenantId } : {}),
  });
  const data = result.data;

  if (data?.accessToken || data?.sessionToken) {
    return { kind: "authenticated" };
  }

  const mfaToken = data?.mfaToken;
  if (!mfaToken) {
    throw new Error("Réponse de connexion invalide");
  }

  return { kind: "mfa_required", mfaToken };
}
