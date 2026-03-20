"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Insurance Claims Contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CAY57LW6Q4KS3BXRNDHC37UJB6LKKA4TGJLQ3KNRG4PTBFOJ3FABBXMK";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Insurance Claims — Contract Methods
// ============================================================

/** Claim status as returned by the contract */
export type ClaimStatusStr = "Filed" | "UnderReview" | "Approved" | "Rejected";

/** Vote statistics returned by get_vote_stats */
export interface VoteStats {
  approvals: number;
  rejections: number;
  total_votes: number;
}

/** Claim data returned by get_claim */
export interface ClaimData {
  claimant: string;
  description: string;
  coverage_amount: bigint;
  status: ClaimStatusStr;
  evidence: string[];
  approvals: number;
  rejections: number;
  filed_at: number;
  voting_started_at: number;
}

/**
 * File a new insurance claim.
 * Calls: file_claim(claimant: Address, description: String, coverage_amount: i128) -> u64
 * Returns: The new claim ID.
 */
export async function fileClaim(
  caller: string,
  description: string,
  coverageAmount: bigint
) {
  return callContract(
    "file_claim",
    [
      toScValAddress(caller),
      toScValString(description),
      toScValI128(coverageAmount),
    ],
    caller,
    true
  );
}

/**
 * Submit evidence to your own claim (only before voting starts).
 * Calls: submit_evidence(claimant: Address, claim_id: u64, evidence: String)
 */
export async function submitEvidence(
  caller: string,
  claimId: bigint,
  evidence: string
) {
  return callContract(
    "submit_evidence",
    [toScValAddress(caller), toScValU64(claimId), toScValString(evidence)],
    caller,
    true
  );
}

/**
 * Start voting on a filed claim. Anyone can trigger this.
 * Calls: start_voting(caller: Address, claim_id: u64)
 */
export async function startVoting(caller: string, claimId: bigint) {
  return callContract(
    "start_voting",
    [toScValAddress(caller), toScValU64(claimId)],
    caller,
    true
  );
}

/**
 * Cast a vote (approve or reject) on a claim under review.
 * Calls: vote(voter: Address, claim_id: u64, approve: bool)
 */
export async function vote(
  caller: string,
  claimId: bigint,
  approve: boolean
) {
  return callContract(
    "vote",
    [toScValAddress(caller), toScValU64(claimId), toScValBool(approve)],
    caller,
    true
  );
}

/**
 * Resolve a claim — anyone can trigger this.
 * Calls: resolve_claim(caller: Address, claim_id: u64)
 */
export async function resolveClaim(caller: string, claimId: bigint) {
  return callContract(
    "resolve_claim",
    [toScValAddress(caller), toScValU64(claimId)],
    caller,
    true
  );
}

/**
 * Get claim details (read-only).
 * Calls: get_claim(claim_id: u64) -> Claim
 */
export async function getClaim(claimId: bigint, caller?: string) {
  return readContract("get_claim", [toScValU64(claimId)], caller);
}

/**
 * Get vote statistics for a claim (read-only).
 * Calls: get_vote_stats(claim_id: u64) -> VoteStats
 */
export async function getVoteStats(claimId: bigint, caller?: string) {
  return readContract("get_vote_stats", [toScValU64(claimId)], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };
