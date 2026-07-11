// Rendu dynamique par requête : la page lit ?status/?ref (sinon Next la prérend en statique
// et affiche toujours l'état par défaut).
export const dynamic = "force-dynamic";

type Search = { [k: string]: string | string[] | undefined };

const CONTINUE_URL = process.env.NEXT_PUBLIC_CONTINUE_URL || "https://shopping.yowyob.com/";

type Variant = {
  key: string;
  title: string;
  message: string;
  tone: "success" | "warning" | "destructive";
  icon: "check" | "x" | "alert";
};

function resolve(status?: string): Variant {
  const s = (status || "").toLowerCase();
  if (["success", "successful", "completed", "paid", "ok"].includes(s)) {
    return {
      key: "success",
      title: "Paiement réussi",
      message: "Votre paiement a bien été confirmé. Un reçu vous sera envoyé par e-mail.",
      tone: "success",
      icon: "check",
    };
  }
  if (["cancelled", "canceled", "cancel"].includes(s)) {
    return {
      key: "cancelled",
      title: "Paiement annulé",
      message: "Vous avez annulé cette transaction. Aucun montant n'a été débité.",
      tone: "warning",
      icon: "alert",
    };
  }
  if (["error", "failed", "rejected"].includes(s)) {
    return {
      key: "error",
      title: "Paiement échoué",
      message: "La transaction n'a pas pu aboutir. Veuillez réessayer ou contacter le support.",
      tone: "destructive",
      icon: "x",
    };
  }
  return {
    key: "pending",
    title: "Paiement en cours",
    message: "Nous traitons votre transaction. Cette page se mettra à jour dès la confirmation.",
    tone: "warning",
    icon: "alert",
  };
}

const TONES: Record<Variant["tone"], { circleBg: string; circleFg: string; btn: string }> = {
  success: { circleBg: "var(--success-bg)", circleFg: "var(--success)", btn: "var(--primary)" },
  warning: { circleBg: "var(--warning-bg)", circleFg: "var(--warning)", btn: "var(--primary)" },
  destructive: { circleBg: "var(--destructive-bg)", circleFg: "var(--destructive)", btn: "var(--primary)" },
};

function Icon({ name }: { name: Variant["icon"] }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "check") {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const ref = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref;
  const v = resolve(status);
  const tone = TONES[v.tone];

  return (
    <main className="min-h-screen flex flex-col">
      {/* Barre supérieure marque */}
      <header className="w-full border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-4">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold text-primary-foreground"
            style={{ background: "var(--primary)" }}
          >
            Y
          </span>
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            Yowyob&nbsp;Pay
          </span>
        </div>
      </header>

      {/* Contenu centré */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm"
          style={{ boxShadow: "0 10px 30px -12px rgba(3,4,94,0.18)" }}
        >
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: tone.circleBg, color: tone.circleFg }}
          >
            <Icon name={v.icon} />
          </div>

          <h1 className="mb-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            {v.title}
          </h1>
          <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {v.message}
          </p>

          {ref && (
            <div
              className="mb-6 rounded-lg px-4 py-3 text-left"
              style={{ background: "var(--muted)" }}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Référence de transaction
              </div>
              <div className="mt-0.5 break-all font-mono text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {ref}
              </div>
            </div>
          )}

          <a
            href={CONTINUE_URL}
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            style={{ background: tone.btn }}
          >
            Retour à la boutique
          </a>
        </div>
      </div>

      <footer className="w-full py-6 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
        Paiement sécurisé par Yowyob&nbsp;Pay
      </footer>
    </main>
  );
}
