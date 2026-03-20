#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    ClaimCounter,
    Claim(u64),
    Voters(u64),
    HasVoted(u64, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claim {
    pub claimant: Address,
    pub description: String,
    pub coverage_amount: i128,
    pub status: ClaimStatus,
    pub evidence: Vec<String>,
    pub approvals: u32,
    pub rejections: u32,
    pub filed_at: u64,
    pub voting_started_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Filed,
    UnderReview,
    Approved,
    Rejected,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    // Anyone can file a claim — no permission needed
    pub fn file_claim(
        env: Env,
        claimant: Address,
        description: String,
        coverage_amount: i128,
    ) -> u64 {
        claimant.require_auth();

        let counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ClaimCounter)
            .unwrap_or(0);
        let claim_id = counter + 1;

        let claim = Claim {
            claimant: claimant.clone(),
            description,
            coverage_amount,
            status: ClaimStatus::Filed,
            evidence: Vec::<String>::new(&env),
            approvals: 0,
            rejections: 0,
            filed_at: env.ledger().timestamp(),
            voting_started_at: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
        env.storage()
            .persistent()
            .set(&DataKey::ClaimCounter, &claim_id);
        env.storage()
            .persistent()
            .set(&DataKey::Voters(claim_id), &Vec::<Address>::new(&env));

        claim_id
    }

    // Claimant adds evidence to their own claim
    pub fn submit_evidence(env: Env, claimant: Address, claim_id: u64, evidence: String) {
        claimant.require_auth();

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        assert_eq!(
            claim.claimant, claimant,
            "only claimant can submit evidence"
        );
        assert_eq!(
            claim.status,
            ClaimStatus::Filed,
            "evidence only allowed before voting"
        );

        claim.evidence.push_back(evidence);
        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
    }

    // Anyone can start voting on a filed claim
    pub fn start_voting(env: Env, caller: Address, claim_id: u64) {
        caller.require_auth();

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        assert_eq!(
            claim.status,
            ClaimStatus::Filed,
            "voting already started or claim resolved"
        );

        claim.status = ClaimStatus::UnderReview;
        claim.voting_started_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
    }

    // Any address casts a vote (approve or reject)
    pub fn vote(env: Env, voter: Address, claim_id: u64, approve: bool) {
        voter.require_auth();

        let has_voted: bool = env
            .storage()
            .persistent()
            .get(&DataKey::HasVoted(claim_id, voter.clone()))
            .unwrap_or(false);

        assert!(!has_voted, "already voted");

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        assert_eq!(claim.status, ClaimStatus::UnderReview, "voting not active");

        claim.approvals += if approve { 1 } else { 0 };
        claim.rejections += if !approve { 1 } else { 0 };

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
        env.storage()
            .persistent()
            .set(&DataKey::HasVoted(claim_id, voter.clone()), &true);

        let mut voters: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Voters(claim_id))
            .unwrap_or_else(|| Vec::<Address>::new(&env));
        voters.push_back(voter);
        env.storage()
            .persistent()
            .set(&DataKey::Voters(claim_id), &voters);
    }

    // Anyone can trigger resolution — majority decides outcome
    pub fn resolve_claim(env: Env, caller: Address, claim_id: u64) {
        caller.require_auth();

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");

        assert_eq!(
            claim.status,
            ClaimStatus::UnderReview,
            "claim not under review"
        );

        claim.status = if claim.approvals > claim.rejections {
            ClaimStatus::Approved
        } else {
            ClaimStatus::Rejected
        };

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
    }

    // Read claim details
    pub fn get_claim(env: Env, claim_id: u64) -> Claim {
        env.storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found")
    }

    // Read vote statistics
    pub fn get_vote_stats(env: Env, claim_id: u64) -> VoteStats {
        let claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .expect("claim not found");
        let voters: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Voters(claim_id))
            .unwrap_or_else(|| Vec::<Address>::new(&env));

        VoteStats {
            approvals: claim.approvals,
            rejections: claim.rejections,
            total_votes: voters.len(),
        }
    }
}

#[contracttype]
#[derive(Clone)]
pub struct VoteStats {
    pub approvals: u32,
    pub rejections: u32,
    pub total_votes: u32,
}

mod test;
