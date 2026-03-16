// ─────────────────────────────────────────────────────────────────────────────
// contract.js — Stellar Soroban Ticket Booking Contract Interface
// Replace CONTRACT_ID with your deployed contract ID after running:
//   stellar contract deploy --wasm ... --source deployer --network testnet
// ─────────────────────────────────────────────────────────────────────────────

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk@11.3.0/+esm";

// ─── Config ──────────────────────────────────────────────────────────────────

export const CONFIG = {
  CONTRACT_ID: "CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B",
  RPC_URL: "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE: Networks.TESTNET,
  BASE_FEE: BASE_FEE,
};

// ─── RPC Server ──────────────────────────────────────────────────────────────

let _server = null;

export function getServer() {
  if (!_server) {
    _server = new SorobanRpc.Server(CONFIG.RPC_URL, { allowHttp: false });
  }
  return _server;
}

// ─── Contract instance ───────────────────────────────────────────────────────

let _contract = null;

export function getContract() {
  if (!_contract) {
    _contract = new Contract(CONFIG.CONTRACT_ID);
  }
  return _contract;
}

// ─── Helper: build + simulate + send transaction ─────────────────────────────

/**
 * Builds, simulates, and submits a contract invocation transaction.
 * @param {string} sourcePublicKey  - Caller's Stellar public key (G...)
 * @param {Function} signTransaction - Async fn(xdrString) → signedXdrString (e.g. Freighter wallet)
 * @param {string} method           - Contract method name
 * @param {...xdr.ScVal} args        - Method arguments as ScVal
 * @returns {Promise<object>}        - { success, result, txHash, error }
 */
export async function invokeContract(sourcePublicKey, signTransaction, method, ...args) {
  try {
    const server = getServer();
    const contract = getContract();

    const account = await server.getAccount(sourcePublicKey);

    const tx = new TransactionBuilder(account, {
      fee: CONFIG.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // Simulate first to get footprint + resource fees
    const simResult = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error("Simulation failed: " + simResult.error);
    }

    // Assemble the final transaction with the simulation data
    const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

    // Sign via wallet (e.g. Freighter)
    const signedXdr = await signTransaction(preparedTx.toXDR());

    // Submit
    const sendResult = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, CONFIG.NETWORK_PASSPHRASE)
    );

    if (sendResult.status === "ERROR") {
      throw new Error("Submit failed: " + JSON.stringify(sendResult.errorResult));
    }

    // Poll for confirmation
    let getResult;
    let attempts = 0;
    do {
      await sleep(2000);
      getResult = await server.getTransaction(sendResult.hash);
      attempts++;
    } while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 15);

    if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      const returnVal = getResult.returnValue
        ? scValToNative(getResult.returnValue)
        : null;
      return { success: true, result: returnVal, txHash: sendResult.hash };
    } else {
      throw new Error("Transaction failed: " + getResult.status);
    }
  } catch (err) {
    console.error(`[contract.js] ${method} error:`, err);
    return { success: false, error: err.message || String(err) };
  }
}

// ─── Helper: read-only simulation (no signing needed) ────────────────────────

/**
 * Calls a read-only contract function via simulation only.
 * No wallet required, no transaction submitted.
 * @param {string} method    - Contract method name
 * @param {...xdr.ScVal} args - Method arguments as ScVal
 * @returns {Promise<any>}   - Native JS value from the contract
 */
export async function readContract(method, ...args) {
  try {
    const server = getServer();
    const contract = getContract();

    // Use a dummy source for read-only calls
    const dummySource = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    const account = await server.getAccount(dummySource);

    const tx = new TransactionBuilder(account, {
      fee: CONFIG.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error("Read simulation failed: " + simResult.error);
    }

    return scValToNative(simResult.result.retval);
  } catch (err) {
    console.error(`[contract.js] read ${method} error:`, err);
    throw err;
  }
}

// ─── Contract Write Methods ───────────────────────────────────────────────────

/**
 * Initialize the contract (run once after deploy).
 * @param {string} adminAddress
 * @param {Function} signTransaction
 */
export async function initialize(adminAddress, signTransaction) {
  return invokeContract(
    adminAddress,
    signTransaction,
    "initialize",
    nativeToScVal(adminAddress, { type: "address" })
  );
}

/**
 * Create a new event on-chain.
 * @param {string} organizerAddress
 * @param {Function} signTransaction
 * @param {object} eventData - { name, venue, date (unix timestamp), totalSeats, pricePerTicket (stroops) }
 * @returns {Promise<{ success, result: eventId, txHash, error }>}
 */
export async function createEvent(organizerAddress, signTransaction, eventData) {
  const { name, venue, date, totalSeats, pricePerTicket } = eventData;

  return invokeContract(
    organizerAddress,
    signTransaction,
    "create_event",
    nativeToScVal(organizerAddress, { type: "address" }),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(venue, { type: "string" }),
    nativeToScVal(BigInt(date), { type: "u64" }),
    nativeToScVal(totalSeats, { type: "u32" }),
    nativeToScVal(BigInt(pricePerTicket), { type: "i128" })
  );
}

/**
 * Book a ticket for an event.
 * @param {string} buyerAddress
 * @param {Function} signTransaction
 * @param {number} eventId
 * @returns {Promise<{ success, result: ticketId, txHash, error }>}
 */
export async function bookTicket(buyerAddress, signTransaction, eventId) {
  return invokeContract(
    buyerAddress,
    signTransaction,
    "book_ticket",
    nativeToScVal(buyerAddress, { type: "address" }),
    nativeToScVal(BigInt(eventId), { type: "u64" })
  );
}

/**
 * Cancel an event (organizer only).
 * @param {string} organizerAddress
 * @param {Function} signTransaction
 * @param {number} eventId
 */
export async function cancelEvent(organizerAddress, signTransaction, eventId) {
  return invokeContract(
    organizerAddress,
    signTransaction,
    "cancel_event",
    nativeToScVal(organizerAddress, { type: "address" }),
    nativeToScVal(BigInt(eventId), { type: "u64" })
  );
}

/**
 * Mark a ticket as used (organizer/gate validation).
 * @param {string} organizerAddress
 * @param {Function} signTransaction
 * @param {number} ticketId
 */
export async function useTicket(organizerAddress, signTransaction, ticketId) {
  return invokeContract(
    organizerAddress,
    signTransaction,
    "use_ticket",
    nativeToScVal(organizerAddress, { type: "address" }),
    nativeToScVal(BigInt(ticketId), { type: "u64" })
  );
}

/**
 * Transfer ticket ownership to a new address.
 * @param {string} currentOwner
 * @param {Function} signTransaction
 * @param {string} newOwner
 * @param {number} ticketId
 */
export async function transferTicket(currentOwner, signTransaction, newOwner, ticketId) {
  return invokeContract(
    currentOwner,
    signTransaction,
    "transfer_ticket",
    nativeToScVal(currentOwner, { type: "address" }),
    nativeToScVal(newOwner, { type: "address" }),
    nativeToScVal(BigInt(ticketId), { type: "u64" })
  );
}

// ─── Contract Read Methods (no wallet needed) ─────────────────────────────────

/**
 * Get full event data by ID.
 * @param {number} eventId
 * @returns {Promise<object>} Event struct
 */
export async function getEvent(eventId) {
  return readContract("get_event", nativeToScVal(BigInt(eventId), { type: "u64" }));
}

/**
 * Get full ticket data by ID.
 * @param {number} ticketId
 * @returns {Promise<object>} Ticket struct
 */
export async function getTicket(ticketId) {
  return readContract("get_ticket", nativeToScVal(BigInt(ticketId), { type: "u64" }));
}

/**
 * Get all ticket IDs held by a wallet address.
 * @param {string} walletAddress
 * @returns {Promise<number[]>} Array of ticket IDs
 */
export async function getUserTickets(walletAddress) {
  return readContract(
    "get_user_tickets",
    nativeToScVal(walletAddress, { type: "address" })
  );
}

/**
 * Get remaining available seats for an event.
 * @param {number} eventId
 * @returns {Promise<number>}
 */
export async function getAvailableSeats(eventId) {
  return readContract("get_available_seats", nativeToScVal(BigInt(eventId), { type: "u64" }));
}

/**
 * Get total number of events created.
 * @returns {Promise<number>}
 */
export async function getEventCount() {
  return readContract("get_event_count");
}

/**
 * Get total number of tickets issued.
 * @returns {Promise<number>}
 */
export async function getTicketCount() {
  return readContract("get_ticket_count");
}

// ─── Freighter Wallet Integration ────────────────────────────────────────────

/**
 * Connects to Freighter wallet and returns the public key.
 * Install Freighter: https://freighter.app
 * @returns {Promise<string>} Public key (G...)
 */
export async function connectFreighter() {
  if (typeof window.freighter === "undefined") {
    throw new Error(
      "Freighter wallet not found. Install it from https://freighter.app"
    );
  }

  const isAllowed = await window.freighter.isAllowed();
  if (!isAllowed) {
    await window.freighter.setAllowed();
  }

  const { publicKey } = await window.freighter.getPublicKey();
  return publicKey;
}

/**
 * Signs a transaction XDR string using Freighter.
 * Pass this as the signTransaction argument to write functions.
 * @param {string} xdrString
 * @returns {Promise<string>} Signed XDR
 */
export async function signWithFreighter(xdrString) {
  const { signedXDR } = await window.freighter.signTransaction(xdrString, {
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  });
  return signedXDR;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Convert XLM to stroops (1 XLM = 10,000,000 stroops)
 * @param {number} xlm
 * @returns {number}
 */
export function xlmToStroops(xlm) {
  return Math.floor(xlm * 1e7);
}

/**
 * Convert stroops to XLM
 * @param {number} stroops
 * @returns {string}
 */
export function stroopsToXlm(stroops) {
  return (stroops / 1e7).toFixed(7).replace(/\.?0+$/, "");
}

/**
 * Convert a Unix timestamp to a readable date string
 * @param {number} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Shorten a Stellar address for display (GABC...XYZ)
 * @param {string} address
 * @returns {string}
 */
export function shortAddress(address) {
  if (!address || address.length < 10) return address;
  return address.slice(0, 6) + "..." + address.slice(-4);
}

/**
 * Sleep helper for polling loops
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Explorer URL ─────────────────────────────────────────────────────────────

/**
 * Get Stellar Expert URL for a contract
 * @returns {string}
 */
export function getContractExplorerUrl() {
  return `https://stellar.expert/explorer/testnet/contract/${CONFIG.CONTRACT_ID}`;
}

/**
 * Get Stellar Expert URL for a transaction
 * @param {string} txHash
 * @returns {string}
 */
export function getTxExplorerUrl(txHash) {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
