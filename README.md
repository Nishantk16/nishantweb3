<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/1488f766-96e7-440f-851c-370a2a95f786" />

# 🛡️ Insurance Claims System (Soroban Smart Contract)

## 📌 Project Description
This project is a decentralized Insurance Claims System built using Soroban smart contracts on the Stellar blockchain. It allows users to submit insurance claims and enables authorized entities to approve them in a transparent and tamper-proof way.

---

## ⚙️ What it does
- Users can create insurance claims with a description.
- Each claim is stored on-chain with a unique ID.
- Claims can be approved by the contract (or future admin logic).
- Anyone can fetch claim details.

---

## ✨ Features
- 📥 Claim Submission  
- 🔍 Claim Tracking  
- ✅ Claim Approval  
- 🔐 Immutable On-chain Storage  
- ⚡ Fast & Low-cost (Stellar Network)  

---

## 🧱 Smart Contract Functions

### 1. create_claim
Creates a new insurance claim.

**Inputs:**
- `claimant` (Address)
- `description` (String)

**Returns:**
- Claim ID (u32)

---

### 2. approve_claim
Approves an existing claim.

**Inputs:**
- `id` (u32)

---

### 3. get_claim
Fetches claim details.

**Inputs:**
- `id` (u32)

**Returns:**
- Claim struct

---

## 🔗 Deployed Smart Contract Link
https://stellar.expert/explorer/testnet/contract/CAENACMU3TUJQRFCN3V55TAG4KLRFMFV6MIB6HUHF3EEX3EXLOUUQR3E

---

## 🚀 Future Improvements
- Add role-based access (Admin / Insurance Company)
- Add claim rejection
- Add claim payout logic
- Integrate frontend (React + Stellar SDK)
- Add document/IPFS support for proofs

---

## 🛠️ Tech Stack
- Soroban (Stellar Smart Contracts)
- Rust
- Stellar Blockchain

---

## 📜 License
MIT License

