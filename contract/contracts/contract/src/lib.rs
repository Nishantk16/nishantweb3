#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, symbol_short, Vec, Map,
    log,
};

// ─── Data Types ───────────────────────────────────────────────────────────────

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
    pub claim_id: u64,
    pub claimant: Address,
    pub policy_id: u64,
    pub amount: i128,        // In stroops (1 XLM = 10_000_000 stroops)
    pub description: String,
    pub status: ClaimStatus,
    pub submitted_at: u64,   // Ledger timestamp
    pub reviewed_at: u64,
    pub reviewer: Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Policy {
    pub policy_id: u64,
    pub holder: Address,
    pub coverage_amount: i128,
    pub premium_paid: i128,
    pub is_active: bool,
    pub created_at: u64,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    ClaimCounter,
    PolicyCounter,
    Claim(u64),
    Policy(u64),
    HolderPolicies(Address),
    ClaimantClaims(Address),
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct InsuranceClaimsContract;

#[contractimpl]
impl InsuranceClaimsContract {

    // ── Initialise ──────────────────────────────────────────────────────────

    /// Deploy and set the admin (insurer) address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ClaimCounter, &0u64);
        env.storage().instance().set(&DataKey::PolicyCounter, &0u64);
    }

    // ── Policy Management ───────────────────────────────────────────────────

    /// Admin registers a new insurance policy for a holder.
    pub fn register_policy(
        env: Env,
        holder: Address,
        coverage_amount: i128,
        premium_paid: i128,
    ) -> u64 {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let policy_id = Self::next_policy_id(&env);
        let now = env.ledger().timestamp();

        let policy = Policy {
            policy_id,
            holder: holder.clone(),
            coverage_amount,
            premium_paid,
            is_active: true,
            created_at: now,
        };

        env.storage().instance().set(&DataKey::Policy(policy_id), &policy);

        // Track all policies owned by this holder
        let mut holder_policies: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::HolderPolicies(holder.clone()))
            .unwrap_or(Vec::new(&env));
        holder_policies.push_back(policy_id);
        env.storage()
            .instance()
            .set(&DataKey::HolderPolicies(holder), &holder_policies);

        log!(&env, "Policy registered: {}", policy_id);
        policy_id
    }

    /// Deactivate a policy (admin only).
    pub fn deactivate_policy(env: Env, policy_id: u64) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut policy: Policy = env
            .storage()
            .instance()
            .get(&DataKey::Policy(policy_id))
            .expect("Policy not found");

        policy.is_active = false;
        env.storage().instance().set(&DataKey::Policy(policy_id), &policy);
    }

    // ── Claims Submission ───────────────────────────────────────────────────

    /// Policy holder submits an insurance claim.
    pub fn submit_claim(
        env: Env,
        claimant: Address,
        policy_id: u64,
        amount: i128,
        description: String,
    ) -> u64 {
        claimant.require_auth();

        // Validate policy exists and is active
        let policy: Policy = env
            .storage()
            .instance()
            .get(&DataKey::Policy(policy_id))
            .expect("Policy not found");

        if !policy.is_active {
            panic!("Policy is not active");
        }
        if policy.holder != claimant {
            panic!("Claimant does not own this policy");
        }
        if amount > policy.coverage_amount {
            panic!("Claim amount exceeds coverage limit");
        }
        if amount <= 0 {
            panic!("Claim amount must be positive");
        }

        let claim_id = Self::next_claim_id(&env);
        let now = env.ledger().timestamp();

        // Use a dummy address for unset reviewer (address::zero equivalent)
        let dummy_reviewer = env.current_contract_address();

        let claim = Claim {
            claim_id,
            claimant: claimant.clone(),
            policy_id,
            amount,
            description,
            status: ClaimStatus::Pending,
            submitted_at: now,
            reviewed_at: 0,
            reviewer: dummy_reviewer,
        };

        env.storage().instance().set(&DataKey::Claim(claim_id), &claim);

        // Track claims per claimant
        let mut claimant_claims: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ClaimantClaims(claimant.clone()))
            .unwrap_or(Vec::new(&env));
        claimant_claims.push_back(claim_id);
        env.storage()
            .instance()
            .set(&DataKey::ClaimantClaims(claimant), &claimant_claims);

        env.events().publish(
            (symbol_short!("CLAIM"), symbol_short!("submit")),
            claim_id,
        );

        log!(&env, "Claim submitted: {}", claim_id);
        claim_id
    }

    // ── Claims Review (Admin) ───────────────────────────────────────────────

    /// Admin marks a claim as under review.
    pub fn start_review(env: Env, claim_id: u64) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut claim: Claim = Self::get_claim_internal(&env, claim_id);
        if claim.status != ClaimStatus::Pending {
            panic!("Claim is not in Pending status");
        }

        claim.status = ClaimStatus::UnderReview;
        claim.reviewed_at = env.ledger().timestamp();
        claim.reviewer = admin;
        env.storage().instance().set(&DataKey::Claim(claim_id), &claim);
    }

    /// Admin approves a claim.
    pub fn approve_claim(env: Env, claim_id: u64) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut claim: Claim = Self::get_claim_internal(&env, claim_id);
        if claim.status != ClaimStatus::UnderReview {
            panic!("Claim must be UnderReview before approval");
        }

        claim.status = ClaimStatus::Approved;
        claim.reviewer = admin;
        env.storage().instance().set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("CLAIM"), symbol_short!("approved")),
            claim_id,
        );
    }

    /// Admin rejects a claim.
    pub fn reject_claim(env: Env, claim_id: u64) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut claim: Claim = Self::get_claim_internal(&env, claim_id);
        if claim.status == ClaimStatus::Paid {
            panic!("Cannot reject an already paid claim");
        }

        claim.status = ClaimStatus::Rejected;
        claim.reviewer = admin;
        env.storage().instance().set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("CLAIM"), symbol_short!("rejected")),
            claim_id,
        );
    }

    /// Admin marks an approved claim as paid (off-chain payment confirmation).
    pub fn mark_paid(env: Env, claim_id: u64) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut claim: Claim = Self::get_claim_internal(&env, claim_id);
        if claim.status != ClaimStatus::Approved {
            panic!("Claim must be Approved before marking as paid");
        }

        claim.status = ClaimStatus::Paid;
        env.storage().instance().set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("CLAIM"), symbol_short!("paid")),
            claim_id,
        );
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    pub fn get_claim(env: Env, claim_id: u64) -> Claim {
        Self::get_claim_internal(&env, claim_id)
    }

    pub fn get_policy(env: Env, policy_id: u64) -> Policy {
        env.storage()
            .instance()
            .get(&DataKey::Policy(policy_id))
            .expect("Policy not found")
    }

    pub fn get_claimant_claims(env: Env, claimant: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::ClaimantClaims(claimant))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_holder_policies(env: Env, holder: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::HolderPolicies(holder))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized")
    }

    pub fn get_claim_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ClaimCounter)
            .unwrap_or(0u64)
    }

    pub fn get_policy_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PolicyCounter)
            .unwrap_or(0u64)
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    fn get_claim_internal(env: &Env, claim_id: u64) -> Claim {
        env.storage()
            .instance()
            .get(&DataKey::Claim(claim_id))
            .expect("Claim not found")
    }

    fn next_claim_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimCounter)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::ClaimCounter, &id);
        id
    }

    fn next_policy_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PolicyCounter)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::PolicyCounter, &id);
        id
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    fn setup() -> (Env, InsuranceClaimsContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, InsuranceClaimsContract);
        let client = InsuranceClaimsContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let holder = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin, holder)
    }

    #[test]
    fn test_register_policy_and_submit_claim() {
        let (env, client, _admin, holder) = setup();

        let coverage = 1_000_000_000i128; // 100 XLM
        let premium = 50_000_000i128;     // 5 XLM

        let policy_id = client.register_policy(&holder, &coverage, &premium);
        assert_eq!(policy_id, 1);

        let claim_id = client.submit_claim(
            &holder,
            &policy_id,
            &500_000_000i128,
            &String::from_str(&env, "Car accident repair"),
        );
        assert_eq!(claim_id, 1);

        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Pending);
        assert_eq!(claim.claimant, holder);
    }

    #[test]
    fn test_full_claim_lifecycle() {
        let (env, client, _admin, holder) = setup();

        let policy_id = client.register_policy(
            &holder,
            &1_000_000_000i128,
            &50_000_000i128,
        );

        let claim_id = client.submit_claim(
            &holder,
            &policy_id,
            &200_000_000i128,
            &String::from_str(&env, "Medical expenses"),
        );

        client.start_review(&claim_id);
        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::UnderReview);

        client.approve_claim(&claim_id);
        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Approved);

        client.mark_paid(&claim_id);
        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Paid);
    }

    #[test]
    fn test_reject_claim() {
        let (env, client, _admin, holder) = setup();

        let policy_id = client.register_policy(&holder, &1_000_000_000i128, &50_000_000i128);
        let claim_id = client.submit_claim(
            &holder,
            &policy_id,
            &100_000_000i128,
            &String::from_str(&env, "Disputed claim"),
        );

        client.start_review(&claim_id);
        client.reject_claim(&claim_id);

        let claim = client.get_claim(&claim_id);
        assert_eq!(claim.status, ClaimStatus::Rejected);
    }

    #[test]
    #[should_panic(expected = "Claim amount exceeds coverage limit")]
    fn test_exceed_coverage_panics() {
        let (env, client, _admin, holder) = setup();
        let policy_id = client.register_policy(&holder, &100_000_000i128, &10_000_000i128);
        client.submit_claim(
            &holder,
            &policy_id,
            &999_000_000i128,
            &String::from_str(&env, "Fraud attempt"),
        );
    }
}