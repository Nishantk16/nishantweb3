#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_file_claim() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);

    // File a claim — anyone can do it permissionlessly
    let claim_id = client.file_claim(
        &claimant,
        &String::from_str(&env, "Car accident damage"),
        &5000_i128,
    );

    assert_eq!(claim_id, 1); // First claim

    let claim = client.get_claim(&1);
    assert_eq!(claim.status, ClaimStatus::Filed);
    assert_eq!(claim.claimant, claimant);
    assert_eq!(
        claim.description,
        String::from_str(&env, "Car accident damage")
    );
    assert_eq!(claim.coverage_amount, 5000_i128);
}

#[test]
fn test_submit_evidence() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    client.file_claim(
        &claimant,
        &String::from_str(&env, "Home damage from storm"),
        &10000_i128,
    );

    // Claimant adds evidence
    client.submit_evidence(
        &claimant,
        &1,
        &String::from_str(&env, "Photos of roof damage"),
    );
    client.submit_evidence(
        &claimant,
        &1,
        &String::from_str(&env, "Weather report showing storm"),
    );

    let claim = client.get_claim(&1);
    assert_eq!(claim.evidence.len(), 2);
}

#[test]
fn test_voting_workflow() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);

    client.file_claim(
        &claimant,
        &String::from_str(&env, "Medical emergency"),
        &15000_i128,
    );

    // Anyone can start voting
    client.start_voting(&voter1, &1);

    let claim = client.get_claim(&1);
    assert_eq!(claim.status, ClaimStatus::UnderReview);

    // Multiple voters vote
    client.vote(&voter1, &1, &true); // approve
    client.vote(&voter2, &1, &true); // approve
    client.vote(&voter3, &1, &false); // reject

    let stats = client.get_vote_stats(&1);
    assert_eq!(stats.approvals, 2);
    assert_eq!(stats.rejections, 1);
    assert_eq!(stats.total_votes, 3);
}

#[test]
fn test_resolve_claim_approved() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    client.file_claim(
        &claimant,
        &String::from_str(&env, "Theft of belongings"),
        &3000_i128,
    );

    client.start_voting(&voter1, &1);
    client.vote(&voter1, &1, &true);
    client.vote(&voter2, &1, &true);

    // Anyone can resolve
    client.resolve_claim(&voter1, &1);

    let claim = client.get_claim(&1);
    assert_eq!(claim.status, ClaimStatus::Approved);
}

#[test]
fn test_resolve_claim_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    client.file_claim(
        &claimant,
        &String::from_str(&env, "Suspicious claim"),
        &99999_i128,
    );

    client.start_voting(&voter1, &1);
    client.vote(&voter1, &1, &false);
    client.vote(&voter2, &1, &false);

    client.resolve_claim(&voter1, &1);

    let claim = client.get_claim(&1);
    assert_eq!(claim.status, ClaimStatus::Rejected);
}

#[test]
fn test_no_double_voting() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let voter = Address::generate(&env);

    client.file_claim(&claimant, &String::from_str(&env, "Test claim"), &1000_i128);

    client.start_voting(&voter, &1);
    client.vote(&voter, &1, &true);

    // Second vote should panic — already voted
    let result = client.try_vote(&voter, &1, &false);
    assert!(result.is_err());
}

#[test]
fn test_cannot_vote_before_voting_starts() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let voter = Address::generate(&env);

    client.file_claim(&claimant, &String::from_str(&env, "Test"), &1000_i128);

    // Cannot vote before voting starts
    let result = client.try_vote(&voter, &1, &true);
    assert!(result.is_err());
}

#[test]
fn test_cannot_resolve_before_voting() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let resolver = Address::generate(&env);

    client.file_claim(&claimant, &String::from_str(&env, "Test"), &1000_i128);

    // Cannot resolve before voting starts
    let result = client.try_resolve_claim(&resolver, &1);
    assert!(result.is_err());
}

#[test]
fn test_cannot_start_voting_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let claimant = Address::generate(&env);
    let user = Address::generate(&env);

    client.file_claim(&claimant, &String::from_str(&env, "Test"), &1000_i128);

    client.start_voting(&user, &1);

    // Cannot start voting again
    let result = client.try_start_voting(&user, &1);
    assert!(result.is_err());
}

#[test]
fn test_get_claim_not_found() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let result = client.try_get_claim(&999);
    assert!(result.is_err());
}

#[test]
fn test_claim_counter_increments() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);
    let u3 = Address::generate(&env);

    // File three separate claims and verify all exist with correct amounts
    let id1 = client.file_claim(&u1, &String::from_str(&env, "A"), &100_i128);
    let id2 = client.file_claim(&u2, &String::from_str(&env, "B"), &200_i128);
    let id3 = client.file_claim(&u3, &String::from_str(&env, "C"), &300_i128);

    // Each claim must have a unique, positive ID
    assert!(id1 >= 1 && id2 >= 1 && id3 >= 1, "IDs must be positive");
    assert!(id1 != id2 && id2 != id3 && id1 != id3, "IDs must be unique");

    // Verify all three claims exist with correct amounts
    let c1 = client.get_claim(&id1);
    let c2 = client.get_claim(&id2);
    let c3 = client.get_claim(&id3);
    assert_eq!(c1.coverage_amount, 100_i128);
    assert_eq!(c2.coverage_amount, 200_i128);
    assert_eq!(c3.coverage_amount, 300_i128);
}
