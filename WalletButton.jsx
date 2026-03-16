import { useWallet } from "../lib/walletStore";

export default function WalletButton() {
  const { address, short, installed, connecting, error, connect, disconnect, isTestnet } = useWallet();

  // Not installed
  if (!installed) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8, fontSize: 12,
          fontWeight: 500, textDecoration: "none",
          background: "rgba(200,240,62,0.1)", color: "#c8f03e",
          border: "1px solid rgba(200,240,62,0.2)",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 14 }}>🔗</span>
        Install Freighter
      </a>
    );
  }

  // Connected
  if (address) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Network warning */}
        {!isTestnet && (
          <span style={{
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            background: "rgba(240,62,106,0.1)", color: "#f03e6a",
            padding: "3px 8px", borderRadius: 6,
            border: "1px solid rgba(240,62,106,0.2)",
          }}>
            Switch to Testnet
          </span>
        )}

        {/* Address pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 8,
          background: "#16161f", border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 12, color: "#f0ede8",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isTestnet ? "#3ef0a0" : "#f03e6a",
            animation: "pulse2 2s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: "'DM Mono', monospace" }}>{short}</span>
        </div>

        {/* Disconnect */}
        <button
          onClick={disconnect}
          style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 12,
            background: "transparent", color: "#555466",
            border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.color = "#f03e6a"; e.target.style.borderColor = "rgba(240,62,106,0.3)"; }}
          onMouseLeave={(e) => { e.target.style.color = "#555466"; e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
          title="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <button
      onClick={connect}
      disabled={connecting}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 8, fontSize: 12,
        fontWeight: 600, cursor: connecting ? "not-allowed" : "pointer",
        background: "#c8f03e", color: "#0a0a0f", border: "none",
        opacity: connecting ? 0.7 : 1, transition: "opacity 0.2s",
      }}
    >
      {connecting ? (
        <>
          <span style={{
            width: 10, height: 10, border: "2px solid #0a0a0f",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.6s linear infinite", display: "inline-block",
          }} />
          Connecting...
        </>
      ) : (
        <>
          <span style={{ fontSize: 13 }}>◎</span>
          Connect Freighter
        </>
      )}
    </button>
  );
}
