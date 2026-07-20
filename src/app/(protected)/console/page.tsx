import { Suspense } from "react";
import ConsolePageClient from "./console-page-client";

export default function ConsolePage() {
  return (
    <Suspense fallback={null}>
      <ConsolePageClient />
    </Suspense>
  );
}
