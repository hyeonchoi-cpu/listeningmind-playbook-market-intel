import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListeningMind for Enterprise · 12 Things & 6 Personas",
  description:
    "Decode demand. Outpace competitors. Decide with the market's actual signal — not the lagging dashboards.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
