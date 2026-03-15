#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
};

// ─── Data Types ────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Event {
    pub event_id: u64,
    pub name: String,
    pub venue: String,
    pub date: u64,          // Unix timestamp
    pub total_seats: u32,
    pub available_seats: u32,
    pub price_per_ticket: i128, // in stroops (1 XLM = 10_000_000 stroops)
    pub organizer: Address,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Ticket {
    pub ticket_id: u64,
    pub event_id: u64,
    pub owner: Address,
    pub seat_number: u32,
    pub purchase_price: i128,
    pub is_used: bool,
}

#[contracttype]
pub enum DataKey {
    Event(u64),
    Ticket(u64),
    EventCount,
    TicketCount,
    UserTickets(Address),
    Admin,
}

// ─── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct TicketBookingContract;

#[contractimpl]
impl TicketBookingContract {

    // ── Initialization ─────────────────────────────────────────────────────────

    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EventCount, &0u64);
        env.storage().instance().set(&DataKey::TicketCount, &0u64);
    }

    // ── Event Management ───────────────────────────────────────────────────────

    /// Create a new event. Only the organizer needs to sign.
    pub fn create_event(
        env: Env,
        organizer: Address,
        name: String,
        venue: String,
        date: u64,
        total_seats: u32,
        price_per_ticket: i128,
    ) -> u64 {
        organizer.require_auth();

        if total_seats == 0 {
            panic!("Total seats must be greater than zero");
        }
        if price_per_ticket <= 0 {
            panic!("Price must be positive");
        }

        let event_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::EventCount)
            .unwrap_or(0)
            + 1;

        let event = Event {
            event_id,
            name,
            venue,
            date,
            total_seats,
            available_seats: total_seats,
            price_per_ticket,
            organizer,
            is_active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        env.storage()
            .instance()
            .set(&DataKey::EventCount, &event_id);

        env.events().publish(
            (symbol_short!("evt_new"), event_id),
            event_id,
        );

        event_id
    }

    /// Cancel an event (organizer only). Does NOT auto-refund on-chain in this
    /// minimal version — refunds are handled off-chain or via a separate flow.
    pub fn cancel_event(env: Env, organizer: Address, event_id: u64) {
        organizer.require_auth();

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .expect("Event not found");

        if event.organizer != organizer {
            panic!("Only the organizer can cancel this event");
        }

        event.is_active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

        env.events().publish(
            (symbol_short!("evt_cncl"), event_id),
            event_id,
        );
    }

    // ── Ticket Booking ─────────────────────────────────────────────────────────

    /// Book one ticket for a buyer. The payment settlement is assumed to happen
    /// via a token contract call before/alongside this invocation in a real
    /// deployment; here we record the booking state on-chain.
    pub fn book_ticket(env: Env, buyer: Address, event_id: u64) -> u64 {
        buyer.require_auth();

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .expect("Event not found");

        if !event.is_active {
            panic!("Event is not active");
        }
        if event.available_seats == 0 {
            panic!("No seats available");
        }
        if env.ledger().timestamp() >= event.date {
            panic!("Event has already started or passed");
        }

        // Assign the next available seat number
        let seat_number = event.total_seats - event.available_seats + 1;
        event.available_seats -= 1;

        let ticket_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TicketCount)
            .unwrap_or(0)
            + 1;

        let ticket = Ticket {
            ticket_id,
            event_id,
            owner: buyer.clone(),
            seat_number,
            purchase_price: event.price_per_ticket,
            is_used: false,
        };

        // Persist updated event & new ticket
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id), &ticket);
        env.storage()
            .instance()
            .set(&DataKey::TicketCount, &ticket_id);

        // Append ticket_id to buyer's ticket list
        let mut user_tickets: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserTickets(buyer.clone()))
            .unwrap_or(Vec::new(&env));
        user_tickets.push_back(ticket_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserTickets(buyer.clone()), &user_tickets);

        env.events().publish(
            (symbol_short!("tkt_book"), ticket_id),
            (buyer, event_id, seat_number),
        );

        ticket_id
    }

    /// Mark a ticket as used (event organizer only — e.g., at the gate).
    pub fn use_ticket(env: Env, organizer: Address, ticket_id: u64) {
        organizer.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .expect("Ticket not found");

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id))
            .expect("Event not found");

        if event.organizer != organizer {
            panic!("Only the event organizer can validate tickets");
        }
        if ticket.is_used {
            panic!("Ticket already used");
        }

        ticket.is_used = true;
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id), &ticket);

        env.events().publish(
            (symbol_short!("tkt_used"), ticket_id),
            ticket_id,
        );
    }

    /// Transfer ticket ownership to another address (peer-to-peer resale).
    pub fn transfer_ticket(
        env: Env,
        current_owner: Address,
        new_owner: Address,
        ticket_id: u64,
    ) {
        current_owner.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .expect("Ticket not found");

        if ticket.owner != current_owner {
            panic!("Caller is not the ticket owner");
        }
        if ticket.is_used {
            panic!("Cannot transfer a used ticket");
        }

        // Remove from old owner's list
        let mut old_tickets: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserTickets(current_owner.clone()))
            .unwrap_or(Vec::new(&env));
        old_tickets.retain(|id| id != ticket_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserTickets(current_owner), &old_tickets);

        // Add to new owner's list
        let mut new_tickets: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserTickets(new_owner.clone()))
            .unwrap_or(Vec::new(&env));
        new_tickets.push_back(ticket_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserTickets(new_owner.clone()), &new_tickets);

        ticket.owner = new_owner.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id), &ticket);

        env.events().publish(
            (symbol_short!("tkt_xfer"), ticket_id),
            (ticket_id, new_owner),
        );
    }

    // ── Read / Query ───────────────────────────────────────────────────────────

    pub fn get_event(env: Env, event_id: u64) -> Event {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .expect("Event not found")
    }

    pub fn get_ticket(env: Env, ticket_id: u64) -> Ticket {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .expect("Ticket not found")
    }

    pub fn get_user_tickets(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserTickets(user))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_available_seats(env: Env, event_id: u64) -> u32 {
        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .expect("Event not found");
        event.available_seats
    }

    pub fn get_event_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::EventCount)
            .unwrap_or(0)
    }

    pub fn get_ticket_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TicketCount)
            .unwrap_or(0)
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, TicketBookingContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TicketBookingContract);
        let client = TicketBookingContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_create_and_book() {
        let (env, client, _admin) = setup();
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "Stellar Summit 2025"),
            &String::from_str(&env, "San Francisco, CA"),
            &9_999_999_999u64, // far future timestamp
            &100u32,
            &10_000_000i128, // 1 XLM
        );

        assert_eq!(event_id, 1);
        assert_eq!(client.get_available_seats(&event_id), 100);

        let ticket_id = client.book_ticket(&buyer, &event_id);
        assert_eq!(ticket_id, 1);
        assert_eq!(client.get_available_seats(&event_id), 99);

        let ticket = client.get_ticket(&ticket_id);
        assert_eq!(ticket.owner, buyer);
        assert_eq!(ticket.seat_number, 1);
        assert!(!ticket.is_used);
    }

    #[test]
    fn test_use_ticket() {
        let (env, client, _admin) = setup();
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "BlockchainConf"),
            &String::from_str(&env, "New York"),
            &9_999_999_999u64,
            &50u32,
            &5_000_000i128,
        );

        let ticket_id = client.book_ticket(&buyer, &event_id);
        client.use_ticket(&organizer, &ticket_id);

        let ticket = client.get_ticket(&ticket_id);
        assert!(ticket.is_used);
    }

    #[test]
    fn test_transfer_ticket() {
        let (env, client, _admin) = setup();
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);
        let new_owner = Address::generate(&env);

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "DeFi Day"),
            &String::from_str(&env, "Miami"),
            &9_999_999_999u64,
            &200u32,
            &2_000_000i128,
        );

        let ticket_id = client.book_ticket(&buyer, &event_id);
        client.transfer_ticket(&buyer, &new_owner, &ticket_id);

        let ticket = client.get_ticket(&ticket_id);
        assert_eq!(ticket.owner, new_owner);
    }

    #[test]
    #[should_panic(expected = "No seats available")]
    fn test_overbooking_fails() {
        let (env, client, _admin) = setup();
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "Tiny Show"),
            &String::from_str(&env, "Garage"),
            &9_999_999_999u64,
            &1u32, // only 1 seat
            &1_000_000i128,
        );

        client.book_ticket(&buyer, &event_id); // OK
        client.book_ticket(&buyer, &event_id); // Should panic
    }
}
