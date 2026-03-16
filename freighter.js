// Freighter Wallet Integration
// Docs: https://docs.freighter.app

export async function isFreighterInstalled() {
  return typeof window !== "undefined" && typeof window.freighter !== "undefined";
}

export async function connectWallet() {
  if (!(await isFreighterInstalled())) {
    throw new Error("Freighter not installed. Visit https://freighter.app to install.");
  }

  const isAllowed = await window.freighter.isAllowed();
  if (!isAllowed) {
    const result = await window.freighter.setAllowed();
    if (!result.isAllowed) {
      throw new Error("User denied wallet access.");
    }
  }

  const { publicKey, error } = await window.freighter.getPublicKey();
  if (error) throw new Error(error);
  return publicKey;
}

export async function getNetwork() {
  if (!(await isFreighterInstalled())) return null;
  const { networkPassphrase } = await window.freighter.getNetworkDetails();
  return networkPassphrase;
}

export async function signTransaction(xdrString) {
  if (!(await isFreighterInstalled())) {
    throw new Error("Freighter not installed.");
  }
  const { signedXDR, error } = await window.freighter.signTransaction(xdrString, {
    networkPassphrase: "Test SDF Network ; September 2015",
  });
  if (error) throw new Error(error);
  return signedXDR;
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
