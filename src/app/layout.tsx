import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather App | Tati Karizska",
  description:
    "Full-stack weather app for PM Accelerator technical assessment — current weather, 5-day forecast, CRUD, exports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            background: "rgba(11,18,32,0.85)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: "min(1100px, calc(100% - 2rem))",
              margin: "0 auto",
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem 0",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ fontSize: "1.05rem" }}>Weather App</strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                Built by Tati Karizska · PM Accelerator Assessment
              </div>
            </div>
            <nav style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
              <Link href="/">Live Weather</Link>
              <Link href="/records">Saved Records (CRUD)</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "1.25rem 0 2rem",
          }}
        >
          <div
            className="muted"
            style={{
              width: "min(1100px, calc(100% - 2rem))",
              margin: "0 auto",
              fontSize: "0.9rem",
            }}
          >
            © {new Date().getFullYear()} Tati Karizska ·{" "}
            <a
              href="https://www.linkedin.com/company/product-manager-accelerator/"
              target="_blank"
              rel="noreferrer"
            >
              Product Manager Accelerator
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
