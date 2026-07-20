import { SessionRefreshProvider } from "@/components/auth/session-refresh-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionRefreshProvider>
      <div className="yypay:min-h-screen">{children}</div>
    </SessionRefreshProvider>
  );
}
