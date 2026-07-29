import { Suspense } from "react";
import { ConsoleShell } from "./console-shell";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  );
}
