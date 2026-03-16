import { useState, useEffect } from "react";
import { stroopsToXlm } from "../lib/contract";
import { useStore } from "../lib/store";
import { useWallet } from "../lib/walletStore";

export default function BookModal({ event, onClose }) {
  const { bookTicket, showToast } = useStore();
  const { address } = useWallet();
  const [addr, setAddr] = useState(address || "");

  useEffect(() => {
    if (address) setAddr(address);
  }, [address]);

  if (!event) return null;
  const seat = event.total - event.avail + 1;

  function confirm() {
    if (!addr || !addr.startsWith("G") || addr.length < 10) {
      showToast("Enter a valid Stellar address (starts with G)", "err");
      return;
    }
    const ok = bookTicket(event.id, addr);
    if (ok) {
      showToast(`Ticket booked! Seat ${seat} — ${event.name}`, "ok");
      onClose();
    } else {
      showToast("Booking failed — no seats available", "err");
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#111118", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 18, padding: 28, width: "90%", maxWidth: 440,
        animation: "fadeUp 0.2s ease forwards",
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#f0ede8" }}>
          {event.name}
        </div>
        <div style={{ fontSize: 12, color: "#8a8896", marginBottom: 18 }}>
          {event.venue} — seat auto-assigned on-chain
        </div>

        <div style={{ background: "#16161f", borderRadius: 9, padding: "12px 14px", fontSize: 12, marginBottom: 14 }}>
          {[
            ["Price", `${stroopsToXlm(event.price)} XLM`],
            ["Seat", `#${seat} (next available)`],
            ["Network", "Stellar Testnet"],
            ["Contract", "CCJCLT...Z2B"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#8a8896" }}>
              <span>{k}</span>
              <span style={{ color: "#f0ede8", fontWeight: 500, fontFamily: k === "Contract" ? "'DM Mono', monospace" : "inherit", fontSize: k === "Contract" ? 10 : 12 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#8a8896", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
            Buyer Wallet Address
            {address && <span style={{ marginLeft: 8, color: "#3ef0a0", fontSize: 10 }}>● Connected</span>}
          </label>
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="G... (56 characters)"
            style={{
              background: address ? "rgba(62,240,160,0.05)" : "#16161f",
              border: `1px solid ${address ? "rgba(62,240,160,0.2)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 9, color: "#f0ede8", fontSize: 14,
              padding: "10px 14px", width: "100%", outline: "none",
              fontFamily: "'DM Mono', monospace", fontSize: 12,
            }}
            onFocus={(e) => e.target.style.borderColor = "#c8f03e"}
            onBlur={(e) => e.target.style.borderColor = address ? "rgba(62,240,160,0.2)" : "rgba(255,255,255,0.07)"}
          />
          {address && (
            <div style={{ fontSize: 11, color: "#555466", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
              Auto-filled from connected Freighter wallet
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer",
            background: "transparent", color: "#f0ede8", border: "1px solid rgba(255,255,255,0.15)",
          }}>Cancel</button>
          <button onClick={confirm} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: "#c8f03e", color: "#0a0a0f", border: "none",
          }}>Confirm Booking</button>
        </div>
      </div>
    </div>
  );
}
