import { createContext, useContext, useState, useEffect } from "react";
import { connectWallet, isFreighterInstalled, getNetwork, shortAddress } from "./freighter";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [network, setNetwork] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if Freighter is installed on mount
    isFreighterInstalled().then(setInstalled);

    // Auto-reconnect if previously connected
    const saved = localStorage.getItem("tc_wallet");
    if (saved) setAddress(saved);
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      const pub = await connectWallet();
      const net = await getNetwork();
      setAddress(pub);
      setNetwork(net);
      localStorage.setItem("tc_wallet", pub);
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setAddress(null);
    setNetwork(null);
    localStorage.removeItem("tc_wallet");
  }

  return (
    <WalletContext.Provider value={{
      address,
      short: shortAddress(address),
      installed,
      network,
      connecting,
      error,
      connect,
      disconnect,
      isTestnet: network?.includes("September 2015"),
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
