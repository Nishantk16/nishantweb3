"use client";

import { useState, useCallback, useEffect } from "react";
import {
  fileClaim,
  submitEvidence,
  startVoting,
  vote,
  resolveClaim,
  getClaim,
  getVoteStats,
  CONTRACT_ADDRESS,
  type ClaimData,
  type ClaimStatusStr,
  type VoteStats,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<ClaimStatusStr, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" | "destructive" }> = {
  Filed:         { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", dot: "bg-[#fbbf24]", variant: "warning" },
  UnderReview:   { color: "text-[#4fc3f7]", bg: "bg-[#4fc3f7]/10", border: "border-[#4fc3f7]/20", dot: "bg-[#4fc3f7] animate-pulse", variant: "info" },
  Approved:      { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  Rejected:      { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "destructive" },
};

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

function Textarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <textarea
          {...props}
          rows={3}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none resize-none"
        />
      </div>
    </div>
  );
}

// ── Claim Card ────────────────────────────────────────────────

function ClaimCard({
  claim,
  claimId,
  onVote,
  onStartVoting,
  onResolve,
  walletAddress,
  isLoading,
}: {
  claim: ClaimData;
  claimId: number;
  onVote?: (approve: boolean) => void;
  onStartVoting?: () => void;
  onResolve?: () => void;
  walletAddress: string | null;
  isLoading?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG["Filed"];
  const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(2); // XLM-like conversion
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40">Claim</span>
          <span className="font-mono text-sm font-semibold text-white/70">#{claimId}</span>
        </div>
        <Badge variant={statusCfg.variant}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
          {claim.status}
        </Badge>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-white/70 leading-relaxed">{claim.description}</p>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Claimant</p>
            <p className="font-mono text-xs text-white/50 mt-0.5">{truncate(claim.claimant)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Coverage</p>
            <p className="font-mono text-xs text-[#fbbf24]/70 mt-0.5">
              {formatAmount(claim.coverage_amount)} XLM
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Approvals</p>
            <p className="font-mono text-xs text-[#34d399]/70 mt-0.5">{claim.approvals}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Rejections</p>
            <p className="font-mono text-xs text-[#f87171]/70 mt-0.5">{claim.rejections}</p>
          </div>
        </div>

        {claim.evidence.length > 0 && (
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Evidence</p>
            <div className="flex flex-wrap gap-1.5">
              {claim.evidence.map((ev, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] text-white/40">
                  <FileTextIcon />
                  {ev}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {claim.status === "Filed" && (
            <button
              onClick={onStartVoting}
              disabled={isLoading || !walletAddress}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#4fc3f7]/20 bg-[#4fc3f7]/[0.05] px-3 py-2 text-xs font-medium text-[#4fc3f7]/80 hover:border-[#4fc3f7]/30 hover:text-[#4fc3f7] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {isLoading ? <SpinnerIcon /> : <VoteIcon />}
              Start Voting
            </button>
          )}

          {claim.status === "UnderReview" && onVote && (
            <>
              <button
                onClick={() => onVote(true)}
                disabled={isLoading || !walletAddress}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#34d399]/20 bg-[#34d399]/[0.05] px-3 py-2 text-xs font-medium text-[#34d399]/80 hover:border-[#34d399]/30 hover:text-[#34d399] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {isLoading ? <SpinnerIcon /> : <ThumbsUpIcon />}
                Approve
              </button>
              <button
                onClick={() => onVote(false)}
                disabled={isLoading || !walletAddress}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#f87171]/20 bg-[#f87171]/[0.05] px-3 py-2 text-xs font-medium text-[#f87171]/80 hover:border-[#f87171]/30 hover:text-[#f87171] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {isLoading ? <SpinnerIcon /> : <ThumbsDownIcon />}
                Reject
              </button>
              {onResolve && (
                <button
                  onClick={onResolve}
                  disabled={isLoading || !walletAddress}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.05] px-3 py-2 text-xs font-medium text-[#7c6cf0]/80 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0] active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {isLoading ? <SpinnerIcon /> : <CheckCircleIcon />}
                  Resolve
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

type Tab = "file" | "browse" | "myclaims";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("file");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // File claim state
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [isFiling, setIsFiling] = useState(false);
  const [lastClaimId, setLastClaimId] = useState<number | null>(null);

  // Evidence state
  const [evidenceClaimId, setEvidenceClaimId] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);

  // Browse state
  const [browseId, setBrowseId] = useState("");
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browseClaim, setBrowseClaim] = useState<{ id: number; data: ClaimData } | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isStartingVoting, setIsStartingVoting] = useState(false);

  // My claims state
  const [myClaims, setMyClaims] = useState<{ id: number; data: ClaimData }[]>([]);
  const [isLoadingMyClaims, setIsLoadingMyClaims] = useState(false);
  const [searchMyClaims, setSearchMyClaims] = useState("");

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // ── File Claim ──────────────────────────────────────────────

  const handleFileClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!desc.trim()) return setError("Enter a description");
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return setError("Enter a valid coverage amount");

    setError(null);
    setIsFiling(true);
    setTxStatus("Awaiting signature...");
    try {
      // coverage_amount is i128, multiply by 1_000_000 for conversion
      const result = await fileClaim(walletAddress, desc.trim(), BigInt(Math.round(amountNum * 1_000_000)));
      const claimId = typeof result === "object" && "hash" in result ? Number(lastClaimId ?? 1) + 1 : Number(lastClaimId ?? 1) + 1;
      setTxStatus("Claim filed on-chain!");
      setDesc("");
      setAmount("");
      setLastClaimId(claimId);
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsFiling(false);
    }
  }, [walletAddress, desc, amount, lastClaimId]);

  // ── Add Evidence ────────────────────────────────────────────

  const handleAddEvidence = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!evidenceClaimId.trim()) return setError("Enter a claim ID");
    if (!evidenceText.trim()) return setError("Enter evidence description");

    setError(null);
    setIsAddingEvidence(true);
    setTxStatus("Awaiting signature...");
    try {
      await submitEvidence(walletAddress, BigInt(Number(evidenceClaimId)), evidenceText.trim());
      setTxStatus("Evidence submitted on-chain!");
      setEvidenceClaimId("");
      setEvidenceText("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsAddingEvidence(false);
    }
  }, [walletAddress, evidenceClaimId, evidenceText]);

  // ── Browse / Search Claim ────────────────────────────────────

  const handleBrowseClaim = useCallback(async () => {
    if (!browseId.trim()) return setError("Enter a claim ID");
    setError(null);
    setIsBrowsing(true);
    setBrowseClaim(null);
    try {
      const result = await getClaim(BigInt(Number(browseId)));
      if (result && typeof result === "object") {
        setBrowseClaim({ id: Number(browseId), data: result as ClaimData });
      } else {
        setError("Claim not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsBrowsing(false);
    }
  }, [browseId]);

  const handleVote = useCallback(async (approve: boolean) => {
    if (!walletAddress || !browseClaim) return;
    setError(null);
    setIsVoting(true);
    setTxStatus("Awaiting signature...");
    try {
      await vote(walletAddress, BigInt(browseClaim.id), approve);
      setTxStatus(approve ? "Vote: Approved — on-chain!" : "Vote: Rejected — on-chain!");
      // Refresh claim
      const result = await getClaim(BigInt(browseClaim.id));
      if (result) setBrowseClaim({ id: browseClaim.id, data: result as ClaimData });
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsVoting(false);
    }
  }, [walletAddress, browseClaim]);

  const handleStartVoting = useCallback(async () => {
    if (!walletAddress || !browseClaim) return;
    setError(null);
    setIsStartingVoting(true);
    setTxStatus("Awaiting signature...");
    try {
      await startVoting(walletAddress, BigInt(browseClaim.id));
      setTxStatus("Voting started on-chain!");
      const result = await getClaim(BigInt(browseClaim.id));
      if (result) setBrowseClaim({ id: browseClaim.id, data: result as ClaimData });
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsStartingVoting(false);
    }
  }, [walletAddress, browseClaim]);

  const handleResolve = useCallback(async () => {
    if (!walletAddress || !browseClaim) return;
    setError(null);
    setIsResolving(true);
    setTxStatus("Awaiting signature...");
    try {
      await resolveClaim(walletAddress, BigInt(browseClaim.id));
      setTxStatus("Claim resolved on-chain!");
      const result = await getClaim(BigInt(browseClaim.id));
      if (result) setBrowseClaim({ id: browseClaim.id, data: result as ClaimData });
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsResolving(false);
    }
  }, [walletAddress, browseClaim]);

  // ── My Claims ───────────────────────────────────────────────

  // Simple approach: try to load claims 1–50 (community browsing)
  const handleLoadMyClaims = useCallback(async () => {
    setError(null);
    setIsLoadingMyClaims(true);
    setMyClaims([]);
    try {
      const claims: { id: number; data: ClaimData }[] = [];
      const maxClaims = parseInt(searchMyClaims) || 20;
      for (let i = 1; i <= Math.min(maxClaims, 100); i++) {
        try {
          const result = await getClaim(BigInt(i));
          if (result && typeof result === "object") {
            claims.push({ id: i, data: result as ClaimData });
          }
        } catch {
          // Claim doesn't exist, skip
        }
      }
      setMyClaims(claims);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      setIsLoadingMyClaims(false);
    }
  }, [searchMyClaims]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "file", label: "File Claim", icon: <PlusIcon />, color: "#7c6cf0" },
    { key: "browse", label: "Browse", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "myclaims", label: "Community", icon: <UserIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckCircleIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <ShieldIcon />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6cf0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Insurance Claims</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setTxStatus(null); setBrowseClaim(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">

            {/* ── FILE CLAIM ─────────────────────────────────── */}
            {activeTab === "file" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
                  <span style={{ color: "#7c6cf0" }} className="font-semibold">fn</span>
                  <span className="text-white/70">file_claim</span>
                  <span className="text-white/20 text-xs">(claimant, description, amount)</span>
                </div>

                <Textarea
                  label="Claim Description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe the incident (e.g. Car accident on Highway 5, roof damage from storm)..."
                />

                <Input
                  label="Coverage Amount (XLM)"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />

                {walletAddress ? (
                  <ShimmerButton onClick={handleFileClaim} disabled={isFiling} shimmerColor="#7c6cf0" className="w-full">
                    {isFiling ? <><SpinnerIcon /> Filing Claim...</> : <><ShieldIcon /> File Claim</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to file a claim
                  </button>
                )}

                {/* Evidence section */}
                <div className="border-t border-white/[0.04] pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/[0.04]" />
                    <span className="text-[10px] uppercase tracking-wider text-white/20">Add Evidence</span>
                    <div className="h-px flex-1 bg-white/[0.04]" />
                  </div>
                  <Input
                    label="Claim ID"
                    type="number"
                    min="1"
                    value={evidenceClaimId}
                    onChange={(e) => setEvidenceClaimId(e.target.value)}
                    placeholder="Enter claim ID to add evidence"
                  />
                  <Textarea
                    label="Evidence Description"
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    placeholder="e.g. Photos of car damage, Repair estimates..."
                  />
                  {walletAddress ? (
                    <button
                      onClick={handleAddEvidence}
                      disabled={isAddingEvidence}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/60 hover:border-white/[0.15] hover:text-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isAddingEvidence ? <><SpinnerIcon /> Submitting...</> : <><FileTextIcon /> Submit Evidence</>}
                    </button>
                  ) : (
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="w-full rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] py-3 text-sm text-white/30 hover:text-white/40 transition-all disabled:opacity-50"
                    >
                      Connect wallet to add evidence
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── BROWSE ──────────────────────────────────────── */}
            {activeTab === "browse" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
                  <span style={{ color: "#4fc3f7" }} className="font-semibold">fn</span>
                  <span className="text-white/70">get_claim</span>
                  <span className="text-white/20 text-xs">(claim_id) &rarr; Claim</span>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#4fc3f7]/30 focus-within:shadow-[0_0_20px_rgba(79,195,247,0.08)]">
                    <input
                      type="number"
                      min="1"
                      value={browseId}
                      onChange={(e) => setBrowseId(e.target.value)}
                      placeholder="Enter claim ID..."
                      className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleBrowseClaim}
                    disabled={isBrowsing}
                    className="flex items-center gap-2 rounded-xl border border-[#4fc3f7]/20 bg-[#4fc3f7]/[0.05] px-4 py-3 text-sm font-medium text-[#4fc3f7]/80 hover:border-[#4fc3f7]/30 hover:text-[#4fc3f7] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isBrowsing ? <SpinnerIcon /> : <SearchIcon />}
                    Lookup
                  </button>
                </div>

                {browseClaim && (
                  <ClaimCard
                    claim={browseClaim.data}
                    claimId={browseClaim.id}
                    walletAddress={walletAddress}
                    onVote={handleVote}
                    onStartVoting={handleStartVoting}
                    onResolve={handleResolve}
                    isLoading={isVoting || isResolving || isStartingVoting}
                  />
                )}
              </div>
            )}

            {/* ── COMMUNITY / MY CLAIMS ──────────────────────── */}
            {activeTab === "myclaims" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
                  <span style={{ color: "#fbbf24" }} className="font-semibold">fn</span>
                  <span className="text-white/70">community claims</span>
                  <span className="text-white/20 text-xs">permissionless browse</span>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#fbbf24]/30">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={searchMyClaims}
                      onChange={(e) => setSearchMyClaims(e.target.value)}
                      placeholder="Max claims to load (default 20)..."
                      className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleLoadMyClaims}
                    disabled={isLoadingMyClaims}
                    className="flex items-center gap-2 rounded-xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] px-4 py-3 text-sm font-medium text-[#fbbf24]/80 hover:border-[#fbbf24]/30 hover:text-[#fbbf24] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isLoadingMyClaims ? <SpinnerIcon /> : <RefreshIcon />}
                    Load
                  </button>
                </div>

                {myClaims.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      {myClaims.length} claim{myClaims.length !== 1 ? "s" : ""} found
                    </p>
                    {myClaims.map(({ id, data }) => (
                      <ClaimCard
                        key={id}
                        claim={data}
                        claimId={id}
                        walletAddress={walletAddress}
                      />
                    ))}
                  </div>
                )}

                {myClaims.length === 0 && !isLoadingMyClaims && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.06] py-10 text-center">
                    <span className="text-white/15"><UserIcon /></span>
                    <p className="text-sm text-white/30">
                      Click &ldquo;Load&rdquo; to browse community claims
                    </p>
                    <p className="text-[10px] text-white/15">
                      Permissionless — anyone can browse all claims
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Insurance Claims &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {(["Filed", "UnderReview", "Approved", "Rejected"] as ClaimStatusStr[]).map((s, i) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-1 w-1 rounded-full", cfg.dot)} />
                    <span className="font-mono text-[9px] text-white/15">{s}</span>
                    {i < 3 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
