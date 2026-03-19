#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec, Map,
};

// ─────────────────────────────────────────────
//  Data Types
// ─────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Pending,
    UnderReview,
    Approved,
    Rejected,
    Paid,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Claim {
    pub claim_id:       u64,
    pub policy_holder:  Address,
    pub amount:         i128,        // in stroops (1 XLM = 10_000_000 stroops)
    pub description:    String,
    pub status:         ClaimStatus,
    pub created_at:     u64,         // ledger timestamp
    pub updated_at:     u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Policy {
    pub policy_id:      u64,
    pub holder:         Address,
    pub coverage_amount: i128,
    pub premium:        i128,
    pub active:         bool,
    pub created_at:     u64,
}

// ─────────────────────────────────────────────
//  Storage Keys
// ─────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    ClaimCounter,
    PolicyCounter,
    Claim(u64),
    Policy(u64),
    HolderPolicies(Address),
    HolderClaims(Address),
}

// ─────────────────────────────────────────────
//  Contract
// ─────────────────────────────────────────────

#[contract]
pub struct InsuranceClaimsContract;

#[contractimpl]
impl InsuranceClaimsContract {

    // ── Initialise ──────────────────────────

    /// Set the contract admin (called once at deployment).
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ClaimCounter,  &0u64);
        env.storage().instance().set(&DataKey::PolicyCounter, &0u64);
    }

    // ── Policy Management ────────────────────

    /// Register a new insurance policy for a holder.
    pub fn create_policy(
        env:             Env,
        holder:          Address,
        coverage_amount: i128,
        premium:         i128,
    ) -> u64 {
        holder.require_auth();

        let counter: u64 = env
            .storage().instance()
            .get(&DataKey::PolicyCounter)
            .unwrap_or(0);
        let policy_id = counter + 1;

        let policy = Policy {
            policy_id,
            holder: holder.clone(),
            coverage_amount,
            premium,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Policy(policy_id), &policy);
        env.storage().instance().set(&DataKey::PolicyCounter, &policy_id);

        // Track policies per holder
        let mut holder_policies: Vec<u64> = env
            .storage().persistent()
            .get(&DataKey::HolderPolicies(holder.clone()))
            .unwrap_or(Vec::new(&env));
        holder_policies.push_back(policy_id);
        env.storage().persistent()
            .set(&DataKey::HolderPolicies(holder), &holder_policies);

        env.events().publish(
            (symbol_short!("policy"), symbol_short!("created")),
            policy_id,
        );

        policy_id
    }

    /// Deactivate a policy (admin or holder).
    pub fn deactivate_policy(env: Env, caller: Address, policy_id: u64) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();

        let mut policy: Policy = env
            .storage().persistent()
            .get(&DataKey::Policy(policy_id))
            .expect("policy not found");

        if caller != admin && caller != policy.holder {
            panic!("unauthorised");
        }

        policy.active = false;
        env.storage().persistent().set(&DataKey::Policy(policy_id), &policy);
    }

    // ── Claims ───────────────────────────────

    /// Submit a new insurance claim.
    pub fn submit_claim(
        env:         Env,
        policy_holder: Address,
        policy_id:   u64,
        amount:      i128,
        description: String,
    ) -> u64 {
        policy_holder.require_auth();

        // Verify policy exists and is active
        let policy: Policy = env
            .storage().persistent()
            .get(&DataKey::Policy(policy_id))
            .expect("policy not found");

        if !policy.active {
            panic!("policy is not active");
        }
        if policy.holder != policy_holder {
            panic!("not your policy");
        }
        if amount > policy.coverage_amount {
            panic!("claim exceeds coverage amount");
        }

        let counter: u64 = env
            .storage().instance()
            .get(&DataKey::ClaimCounter)
            .unwrap_or(0);
        let claim_id = counter + 1;

        let now = env.ledger().timestamp();
        let claim = Claim {
            claim_id,
            policy_holder: policy_holder.clone(),
            amount,
            description,
            status: ClaimStatus::Pending,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(&DataKey::Claim(claim_id), &claim);
        env.storage().instance().set(&DataKey::ClaimCounter, &claim_id);

        // Track claims per holder
        let mut holder_claims: Vec<u64> = env
            .storage().persistent()
            .get(&DataKey::HolderClaims(policy_holder.clone()))
            .unwrap_or(Vec::new(&env));
        holder_claims.push_back(claim_id);
        env.storage().persistent()
            .set(&DataKey::HolderClaims(policy_holder), &holder_claims);

        env.events().publish(
            (symbol_short!("claim"), symbol_short!("submitted")),
            claim_id,
        );

        claim_id
    }

    /// Update a claim's status (admin only).
    pub fn update_claim_status(
        env:      Env,
        admin:    Address,
        claim_id: u64,
        status:   ClaimStatus,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("only admin can update claim status");
        }

        let mut claim: Claim = env
            .storage().persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        claim.status     = status;
        claim.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("claim"), symbol_short!("updated")),
            claim_id,
        );
    }

    // ── Queries ──────────────────────────────

    /// Get a claim by ID.
    pub fn get_claim(env: Env, claim_id: u64) -> Claim {
        env.storage().persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found")
    }

    /// Get a policy by ID.
    pub fn get_policy(env: Env, policy_id: u64) -> Policy {
        env.storage().persistent()
            .get(&DataKey::Policy(policy_id))
            .expect("policy not found")
    }

    /// Get all claim IDs for a policy holder.
    pub fn get_holder_claims(env: Env, holder: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::HolderClaims(holder))
            .unwrap_or(Vec::new(&env))
    }

    /// Get all policy IDs for a policy holder.
    pub fn get_holder_policies(env: Env, holder: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::HolderPolicies(holder))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the total number of claims submitted.
    pub fn total_claims(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::ClaimCounter).unwrap_or(0)
    }

    /// Get the total number of policies created.
    pub fn total_policies(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::PolicyCounter).unwrap_or(0)
    }

    /// Get the contract admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}