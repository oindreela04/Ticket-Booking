# 🎟️ Ticket Booking Smart Contract on Stellar

<p align="center">
  <img src="https://img.shields.io/badge/Stellar-Soroban-7B2D8B?style=for-the-badge&logo=stellar&logoColor=white" />
  <img src="https://img.shields.io/badge/Rust-1.78+-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/Network-Testnet-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## 📖 Project Description

A blockchain-based ticket booking system built on the **Stellar network** using **Soroban smart contracts**. This project eliminates fake tickets, hidden fees, and centralised intermediaries by putting the entire ticketing lifecycle — from event creation to seat validation — directly on-chain.

Every booking is transparent, every ticket is verifiable, and ownership can be transferred peer-to-peer without any third party.

---

## 🔗 Deployed Smart Contract

| Network | Contract ID |
|---|---|
| **Stellar Testnet** | [`CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B`](https://stellar.expert/explorer/testnet/contract/CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B) |

> View live contract state, transactions, and invocations on [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B).

---

## ✨ What It Does

This contract allows three types of users to interact with the ticketing system:

- **Organizers** can create events by setting the name, venue, date, total seats, and price per ticket. They can also cancel events and validate tickets at the gate.
- **Buyers** can browse active events and book a seat. Each ticket is assigned a unique seat number and stored on-chain under the buyer's wallet address.
- **Ticket holders** can transfer their ticket to any other Stellar wallet address, enabling a trustless peer-to-peer resale market.

---

## 🚀 Features

### 🏟️ Event Management
- Create events with name, venue, date, total seats, and XLM ticket price
- Cancel events (organizer-only)
- Real-time seat availability tracking on every booking

### 🎫 Ticket Lifecycle
- Book a seat — auto-assigned seat number, stored on-chain
- Validate a ticket at the door — organizer marks it as used
- Transfer ticket ownership — full peer-to-peer resale support
- Booking is blocked automatically if the event is sold out, inactive, or already started

### 🔒 Security
- Every action requires the signer's authorization via `require_auth()`
- Only the event organizer can cancel events or validate tickets
- Only the current ticket owner can transfer their ticket
- Contract can only be initialized once

### 📡 On-Chain Event Logs
| Event | Trigger |
|---|---|
| `evt_new` | New event created |
| `evt_cncl` | Event cancelled |
| `tkt_book` | Ticket booked |
| `tkt_used` | Ticket validated at gate |
| `tkt_xfer` | Ticket transferred to new owner |

### 🔍 Query Functions
| Function | Description |
|---|---|
| `get_event(event_id)` | Returns full event details |
| `get_ticket(ticket_id)` | Returns full ticket details |
| `get_user_tickets(address)` | Returns all ticket IDs owned by an address |
| `get_available_seats(event_id)` | Returns remaining seat count |
| `get_event_count()` | Returns total events created |
| `get_ticket_count()` | Returns total tickets issued |

---

## 🏗️ Project Structure

```
ticket_booking/
├── Cargo.toml        # Soroban SDK dependency and build profiles
└── src/
    └── lib.rs        # Contract logic, data types, and unit tests
```

---

## 🛠️ Getting Started

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM compile target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli --features opt
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

Compiled artifact:
```
target/wasm32-unknown-unknown/release/ticket_booking.wasm
```

### Run Tests

```bash
cargo test
```

Expected output:
```
test test::test_create_and_book   ... ok
test test::test_use_ticket        ... ok
test test::test_transfer_ticket   ... ok
test test::test_overbooking_fails ... ok
```

---

## 🌐 Deploy to Stellar Testnet

```bash
# 1. Generate and fund a testnet wallet
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ticket_booking.wasm \
  --source deployer \
  --network testnet

# 3. Initialize the contract
stellar contract invoke \
  --id CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_STELLAR_ADDRESS>
```

---

## 💡 Contract Invocation Examples

```bash
# Create an event
stellar contract invoke \
  --id CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B \
  --source organizer --network testnet \
  -- create_event \
  --organizer <ORGANIZER_ADDRESS> \
  --name "Stellar Summit 2025" \
  --venue "San Francisco, CA" \
  --date 1767225600 \
  --total_seats 500 \
  --price_per_ticket 10000000

# Book a ticket
stellar contract invoke \
  --id CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B \
  --source buyer --network testnet \
  -- book_ticket \
  --buyer <BUYER_ADDRESS> \
  --event_id 1

# Validate a ticket at the gate
stellar contract invoke \
  --id CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B \
  --source organizer --network testnet \
  -- use_ticket \
  --organizer <ORGANIZER_ADDRESS> \
  --ticket_id 1

# Transfer a ticket to another wallet
stellar contract invoke \
  --id CCJCLT65QXZ2UW6J32HXIR3LRREK6PKQ6IE7RGEW6KTGEFXE6MV5EZ2B \
  --source holder --network testnet \
  -- transfer_ticket \
  --current_owner <HOLDER_ADDRESS> \
  --new_owner <FRIEND_ADDRESS> \
  --ticket_id 1
```

---

## 🗺️ Roadmap

- [ ] On-chain XLM payment collection via Stellar Asset Contract (SAC)
- [ ] Automatic refunds on event cancellation
- [ ] Resale royalty fee for organizers on secondary transfers
- [ ] Multi-seat booking in a single transaction
- [ ] IPFS metadata link per event (poster, description)

---

## 📄 License

MIT © 2025 — Free to use, fork, and build on.

---

<p align="center">Built on <a href="https://stellar.org">Stellar</a> · Powered by <a href="https://soroban.stellar.org">Soroban</a></p>
