# 🏥 Insurance Claims System — Soroban Smart Contract

![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B2FBE?style=for-the-badge&logo=stellar&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Network](https://img.shields.io/badge/Network-Testnet-orange?style=for-the-badge)

---

## 📋 Project Description

The **Insurance Claims System** is a decentralised smart contract built on the **Stellar blockchain** using the **Soroban SDK**. It digitises the end-to-end insurance lifecycle — from policy creation to claim resolution — removing the need for centralised intermediaries, reducing paperwork, and making every action transparent and auditable on-chain.

Traditional insurance claim systems suffer from:
- Slow, opaque processing
- High administrative overhead
- Fraud risk due to lack of verifiable records
- Delayed payouts

This contract solves all of the above by anchoring every policy, claim, and status update permanently on-chain.

---

## ⚙️ What It Does

The contract manages two core entities: **Policies** and **Claims**.

**Policies** represent an insurance agreement between a holder and the insurer. A policy holder registers a policy specifying a coverage amount and premium. The policy remains active until explicitly deactivated.

**Claims** are filed against active policies. A policy holder submits a claim with a description and an amount that cannot exceed their coverage. An admin (the insurer) then reviews and updates the claim through its lifecycle: `Pending → UnderReview → Approved / Rejected → Paid`.

Every action emits an on-chain event so that external observers (front-end dashboards, auditors) can track the full history without querying contract state directly.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth-protected Actions** | Policy creation requires the holder's signature; claim updates require the admin's signature |
| 📄 **Policy Management** | Create, query, and deactivate insurance policies with coverage and premium amounts |
| 📝 **Claim Submission** | Submit claims against active policies with description and amount validation |
| 🔄 **Claim Lifecycle** | Five-stage status flow: `Pending → UnderReview → Approved → Rejected → Paid` |
| 🚫 **Coverage Validation** | Claims that exceed the policy's coverage amount are automatically rejected |
| 📊 **Per-holder Indexes** | Quickly fetch all policies and claims belonging to a specific address |
| 📡 **On-chain Events** | Every policy creation, claim submission, and status update emits a Soroban event |
| 🧪 **Full Test Suite** | Six unit tests covering happy paths and edge cases (over-claim, inactive policy, etc.) |

---

## 🏗️ Contract Architecture

```
InsuranceClaimsContract
├── initialize(admin)
│
├── Policy Functions
│   ├── create_policy(holder, coverage_amount, premium) → policy_id
│   ├── deactivate_policy(caller, policy_id)
│   ├── get_policy(policy_id) → Policy
│   └── get_holder_policies(holder) → Vec<u64>
│
├── Claim Functions
│   ├── submit_claim(holder, policy_id, amount, description) → claim_id
│   ├── update_claim_status(admin, claim_id, status)
│   ├── get_claim(claim_id) → Claim
│   └── get_holder_claims(holder) → Vec<u64>
│
└── Stats
    ├── total_claims() → u64
    ├── total_policies() → u64
    └── get_admin() → Address
```

---

## 📁 Project Structure

```
InsuranceClaimsSystem/
├── Cargo.toml                              # Workspace manifest
└── contracts/
    └── insurance-claims/
        ├── Cargo.toml                      # Contract dependencies
        └── src/
            ├── lib.rs                      # Main contract code
            └── test.rs                     # Unit tests
```

---

## 🚀 Getting Started

### Prerequisites

- Rust `1.74+` with `wasm32v1-none` target
- Stellar CLI (`stellar`)

```bash
# Install Rust target
rustup target add wasm32v1-none

# Install Stellar CLI
cargo install --locked stellar-cli --features opt
```

### Build

```bash
stellar contract build
```

The compiled `.wasm` file will appear at:
`target/wasm32v1-none/release/insurance_claims.wasm`

### Run Tests

```bash
cargo test
```

### Deploy to Testnet

```bash
# 1. Generate and fund a testnet account
stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/insurance_claims.wasm \
  --source alice \
  --network testnet

# 3. Initialise with admin address
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

### Invoke Examples

```bash
# Create a policy (500 XLM coverage, 10 XLM premium)
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- create_policy \
  --holder <HOLDER_ADDRESS> \
  --coverage_amount 5000000000 \
  --premium 100000000

# Submit a claim
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- submit_claim \
  --policy_holder <HOLDER_ADDRESS> \
  --policy_id 1 \
  --amount 1000000000 \
  --description "Car accident on highway"

# Admin approves a claim
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- update_claim_status \
  --admin <ADMIN_ADDRESS> \
  --claim_id 1 \
  --status '{"Approved": null}'
```

> **Note:** All amounts are in **stroops** — the smallest unit of XLM.  
> `1 XLM = 10,000,000 stroops`

---

## 🗺️ Claim Status Flow

```
  [Submitted]
      │
      ▼
  PENDING ──► UNDER_REVIEW ──► APPROVED ──► PAID
                    │
                    └──────────► REJECTED
```

---

## 🔗 Deployed Smart Contract

**Network:** Stellar Testnet

**Contract ID:**
```
CBSP56AABQPQPMN3QPY6QWT3BDLQJPW6T7RXZF63OIFYC64FHIOH25NN
```

> Replace `XXX` with your contract ID after running `stellar contract deploy`.  
> View on Stellar Expert: `https://stellar.expert/explorer/testnet/contract/XXX`

---

## 🧪 Test Coverage

| Test | Scenario |
|---|---|
| `test_initialize` | Admin is set, counters start at zero |
| `test_create_policy` | Policy created with correct fields |
| `test_submit_claim` | Claim filed with Pending status |
| `test_update_claim_status` | Admin changes status to Approved |
| `test_get_holder_claims_and_policies` | Multi-policy, multi-claim indexing |
| `test_claim_exceeds_coverage` | Panics when amount > coverage |
| `test_claim_on_inactive_policy` | Panics when policy is deactivated |

---

## 📜 License

MIT © 2025
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/849dd46e-916f-42a7-a0c0-3538bcfc0cf0" />
