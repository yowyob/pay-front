import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yowyob Pay",
  description: "Paiement en ligne Yowyob Pay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
