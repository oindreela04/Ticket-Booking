import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useStore } from "../lib/store";
import WalletButton from "./WalletButton";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/create", label: "Create" },
  { href: "/tickets", label: "My Tickets" },
  { href: "/validate", label: "Validate" },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { toast } = useStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh" }}>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 60,
        background: scrolled ? "rgba(10,10,15,0.95)" : "rgba(10,10,15,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        transition: "background 0.3s",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 7, height: 7, background: "#c8f03e", borderRadius: "50%",
              animation: "pulse2 2s ease-in-out infinite",
            }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#f0ede8", letterSpacing: "-0.5px" }}>
              TicketChain
            </span>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV.map(({ href, label }) => {
            const active = router.pathname === href;
            return (
              <Link key={href} href={href} style={{
                color: active ? "#f0ede8" : "#8a8896",
                textDecoration: "none", fontSize: 13, fontWeight: 500,
                padding: "5px 12px", borderRadius: 8,
                background: active ? "#16161f" : "transparent",
                transition: "all 0.2s",
              }}>{label}</Link>
            );
          })}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />
          <WalletButton />
        </div>
      </nav>

      <main style={{ paddingTop: 60, position: "relative", zIndex: 1 }}>
        {children}
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 999,
          background: "#111118",
          border: `1px solid ${toast.type === "ok" ? "rgba(62,240,160,0.3)" : "rgba(240,62,106,0.3)"}`,
          borderRadius: 10, padding: "12px 16px", fontSize: 13,
          display: "flex", alignItems: "center", gap: 8, minWidth: 260,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "slideIn 0.25s ease forwards", color: "#f0ede8",
        }}>
          <span style={{ fontSize: 15 }}>{toast.type === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse2 {
          0%,100% { box-shadow: 0 0 0 0 rgba(200,240,62,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(200,240,62,0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
