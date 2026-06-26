"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldAlert,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";type WatcherFinding = {
  id: string;
  severity: string;
  status: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  finding: string;
  recommendation: string | null;
  financial_impact: number | null;
  evidence: any;
  business_date: string | null;
  created_at: string;
  review_status: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

type CashMovement = {
  id: string;
  cash_cash_drawer_id: string | null;
  movement_type: string | null;
  source: string | null;
  amount: number | null;
  payment_type: string | null;
  business_date: string | null;
  status: string | null;
  created_at?: string | null;
  remarks?: string | null;
  from_person?: string | null;
  to_person?: string | null;
  encoded_by?: string | null;
};

const peso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MANAGEMENT_ADJUSTMENT_PAYMENT_TYPES = [
  "owners abono",
  "owner abono",
  "pool bar expenses from sales",
];

const NON_CASH_PAYMENT_TYPES = [
  "gcash",
  "bank",
  "bank transfer",
  "terminal",
  "credit card",
  "card",
];

export default function FinancialWatcherPage() {
  const [findings, setFindings] = useState<WatcherFinding[]>([]);
  const [selected, setSelected] = useState<WatcherFinding | null>(null);
  const [investigation, setInvestigation] = useState<WatcherFinding | null>(null);
  const [activeTab, setActiveTab] = useState<"FOR_REVIEW" | "REVIEWED">("FOR_REVIEW");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFindings();
  }, []);

  async function loadFindings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("watcher_findings")
      .select("*")
      .eq("watcher_type", "FINANCIAL")
      .eq("status", "OPEN")
      .order("financial_impact", { ascending: false });

    if (error) {
      console.error("[FINANCIAL WATCHER]", error);
      setFindings([]);
    } else {
      setFindings((data || []) as WatcherFinding[]);
      setSelected(((data || [])[0] as WatcherFinding) || null);
    }

    setLoading(false);
  }

  const visibleFindings = useMemo(() => {
    return findings.filter((finding) => {
      const reviewStatus = finding.review_status || "FOR_REVIEW";
      return activeTab === "REVIEWED"
        ? reviewStatus === "REVIEWED"
        : reviewStatus !== "REVIEWED";
    });
  }, [findings, activeTab]);

  useEffect(() => {
    setSelected(visibleFindings[0] || null);
  }, [visibleFindings]);

  const stats = useMemo(() => {
    const forReview = findings.filter(
      (f) => (f.review_status || "FOR_REVIEW") !== "REVIEWED"
    );
    const reviewed = findings.filter((f) => f.review_status === "REVIEWED");
    const critical = forReview.filter((f) => f.severity === "CRITICAL").length;
    const exposure = forReview.reduce(
      (sum, f) => sum + Number(f.financial_impact || 0),
      0
    );

    return {
      critical,
      forReview: forReview.length,
      reviewed: reviewed.length,
      exposure,
      total: findings.length,
    };
  }, [findings]);

  return (
    <PageGuard moduleKey="finance_dashboard">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="FINANCE / FINANCIAL WATCHER" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              OPSCORE Watcher
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Financial Watcher
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
              Reviews cash variance, approval traceability, duplicate risks,
              turnover issues, and financial exposure.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Critical Findings" value={stats.critical} tone="danger" />
            <KpiCard label="For Review" value={stats.forReview} tone="warning" />
            <KpiCard label="Reviewed" value={stats.reviewed} tone="info" />
            <KpiCard label="Financial Exposure" value={peso(stats.exposure)} tone="danger" />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Watcher Findings Queue
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Issues Requiring Attention
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("FOR_REVIEW")}
                    className={`h-11 rounded-xl border px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                      activeTab === "FOR_REVIEW"
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    For Review ({stats.forReview})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("REVIEWED")}
                    className={`h-11 rounded-xl border px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                      activeTab === "REVIEWED"
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Reviewed ({stats.reviewed})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="py-14 text-center text-sm font-semibold text-slate-500">
                    Loading watcher findings...
                  </div>
                ) : visibleFindings.length === 0 ? (
                  <div className="py-14 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                    <p className="mt-3 text-sm font-black text-slate-950">
                      No open financial findings.
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {activeTab === "REVIEWED" ? "No reviewed financial findings yet." : "Financial Watcher did not find unresolved issues."}
                    </p>
                  </div>
                ) : (
                  visibleFindings.map((finding) => (
                    <button
                      key={finding.id}
                      type="button"
                      onClick={() => {
                        setSelected(finding);
                        setInvestigation(finding);
                      }}
                      className={`flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-all duration-200 hover:bg-slate-50 ${
                        selected?.id === finding.id ? "bg-slate-50" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                            {finding.entity_type}
                          </span>
                          {(finding.review_status || "FOR_REVIEW") === "REVIEWED" && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                              Reviewed
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-sm font-black text-slate-950">
                          {humanTitle(finding)}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
                          {finding.finding}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Impact
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {formatImpact(finding)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Investigation Summary
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Watcher Explanation
                </h2>
              </div>

              {selected ? (
                <div className="space-y-5 p-6">
                  <div>
                    <SeverityBadge severity={selected.severity} />
                    <h3 className="mt-3 text-xl font-black text-slate-950">
                      {humanTitle(selected)}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {selected.finding}
                    </p>
                  </div>

                  <InfoBlock
                    icon={<ShieldAlert size={18} />}
                    label="Impact"
                    value={formatImpact(selected)}
                  />

                  <InfoBlock
                    icon={<AlertTriangle size={18} />}
                    label="Recommended Action"
                    value={selected.recommendation || "Review finding details."}
                  />

                  <button
                    type="button"
                    onClick={() => setInvestigation(selected)}
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Open Investigation
                  </button>
                </div>
              ) : (
                <div className="p-6 text-sm font-medium text-slate-500">
                  Select a watcher finding to review the explanation.
                </div>
              )}
            </aside>
          </section>
        </main>

        {investigation && (
          <InvestigationDrawer
            finding={investigation}
            onClose={() => setInvestigation(null)}
            onReviewed={() => {
              setInvestigation(null);
              loadFindings();
              setActiveTab("REVIEWED");
            }}
          />
        )}
      </div>
    </PageGuard>
  );
}

function InvestigationDrawer({
  finding,
  onClose,
  onReviewed,
}: {
  finding: WatcherFinding;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(finding.review_notes || "");
  const [savingReview, setSavingReview] = useState(false);

  const evidence = finding.evidence || {};
  const isDrawerVariance = finding.entity_type === "CASH_DRAWER";
  const drawerId = finding.entity_id;
  const drawerBusinessDate = getBusinessDate(finding, evidence);

  useEffect(() => {
    async function loadMovements() {
      if (!drawerId || finding.entity_type !== "CASH_DRAWER") {
        setMovements([]);
        return;
      }

      setLoadingMovements(true);

      let query = supabase
        .from("finance_cash_movements")
        .select(
          "id,cash_cash_drawer_id,movement_type,source,amount,payment_type,business_date,status,created_at,remarks,from_person,to_person,encoded_by"
        )
        .eq("cash_cash_drawer_id", drawerId)
        .eq("status", "ACTIVE");

      if (drawerBusinessDate) {
        query = query.eq("business_date", drawerBusinessDate);
      }

      const { data, error } = await query
        .order("business_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[WATCHER MOVEMENTS]", error);
        setMovements([]);
      } else {
        setMovements((data || []) as CashMovement[]);
      }

      setLoadingMovements(false);
    }

    loadMovements();
  }, [drawerId, drawerBusinessDate, finding.entity_type]);

  async function markReviewed() {
    setSavingReview(true);

    const reviewedByName =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_name") || "OPSCORE User"
        : "OPSCORE User";

    const { error } = await supabase
      .from("watcher_findings")
      .update({
        review_status: "REVIEWED",
        reviewed_by_name: reviewedByName,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", finding.id);

    setSavingReview(false);

    if (error) {
      console.error("[WATCHER REVIEW]", error);
      alert("Failed to mark finding as reviewed.");
      return;
    }

    onReviewed();
  }

  const parsedExpected = extractNumberFromRemarks(
    String(evidence.remarks || ""),
    "Expected Cash"
  );

  const expected = Number(
    evidence.expected_cash_column ||
      evidence.expected_cash ||
      parsedExpected ||
      0
  );

  const actual = Number(evidence.actual_cash || 0);
  const variance = Number(evidence.variance ?? finding.financial_impact ?? 0);
  const openingFloat = Number(evidence.opening_float || 0);

  const operationalCashInRows = groupMovements(
    movements,
    "Cash In",
    isOperationalCashMovement
  );
  const operationalCashOutRows = groupMovements(
    movements,
    "Cash Out",
    isOperationalCashMovement
  );
  const managementAdjustmentRows = groupMovements(
    movements,
    "Cash In",
    isManagementAdjustmentMovement
  );
  const nonCashCollectionRows = groupMovements(
    movements,
    "Cash In",
    isNonCashMovement
  );

  const operationalCashInTotal = sumMovementType(
    movements,
    "Cash In",
    isOperationalCashMovement
  );
  const operationalCashOutTotal = sumMovementType(
    movements,
    "Cash Out",
    isOperationalCashMovement
  );
  const managementAdjustmentTotal = sumMovementType(
    movements,
    "Cash In",
    isManagementAdjustmentMovement
  );
  const nonCashCollectionTotal = sumMovementType(
    movements,
    "Cash In",
    isNonCashMovement
  );
  const turnoverTotal = sumMovementType(movements, "Turnover");

  const recordedTurnover =
    turnoverTotal ||
    extractNumberFromRemarks(String(evidence.remarks || ""), "Cash Turnover Out") ||
    extractNumberFromRemarks(String(evidence.remarks || ""), "Actual Cash") ||
    actual;

  const turnoverDifference =
    expected > 0 ? Math.abs(expected - Number(recordedTurnover || 0)) : Math.abs(variance);

  const expectedFromMovements =
    openingFloat + operationalCashInTotal - operationalCashOutTotal;

  const formulaDifference =
    expected > 0 ? expected - expectedFromMovements : 0;

  const businessDate = formatDate(drawerBusinessDate || evidence.closed_at || evidence.opened_at);
  const drawerHolder = evidence.drawer_holder || "Drawer Holder";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/35">
      <div className="fixed right-0 top-16 flex h-[calc(100vh-64px)] w-[92vw] max-w-[1500px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Financial Investigation
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {humanTitle(finding)}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                OPSCORE Watcher explains what happened in plain operational language.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard label="Problem" value={finding.severity} tone="danger" />
            <SummaryCard label="Impact" value={formatImpact(finding)} tone="warning" />
            <SummaryCard
              label="Status"
              value={isDrawerVariance ? "Variance Review" : "System Review"}
              tone="info"
            />
          </div>

          {isDrawerVariance ? (
            <>
              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Cash Position
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                  <BigMetric label="Drawer Holder" value={drawerHolder} />
                  <BigMetric label="Business Date" value={businessDate || "Not provided"} />
                  <BigMetric label="Expected Cash" value={expected > 0 ? peso(expected) : "Needs review"} />
                  <BigMetric label="Actual Cash" value={peso(actual)} />
                  <BigMetric
                    label={variance < 0 ? "Missing Cash" : "Cash Overage"}
                    value={peso(Math.abs(variance))}
                    danger={variance < 0}
                  />
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Turnover Analysis
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SummaryCard
                    label="Expected Turnover"
                    value={expected > 0 ? peso(expected) : "Needs review"}
                    tone="info"
                  />
                  <SummaryCard
                    label="Recorded Turnover / Actual"
                    value={loadingMovements ? "Loading..." : peso(recordedTurnover)}
                    tone="warning"
                  />
                  <SummaryCard
                    label="Turnover Gap"
                    value={loadingMovements ? "Loading..." : peso(turnoverDifference)}
                    tone="danger"
                  />
                </div>

                <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-700">
                  {expected > 0
                    ? `Watcher detected a possible turnover issue. The drawer should have had ${peso(
                        expected
                      )}, but only ${peso(recordedTurnover)} was recorded or counted. Turnover gap: ${peso(
                        turnoverDifference
                      )}.`
                    : "Watcher cannot compute the exact expected turnover from stored drawer fields. Review drawer remarks and movement details."}
                </p>
              </section>

              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <MovementSummaryPanel
                  title="Operational Cash In"
                  subtitle="Included in physical drawer cash position."
                  loading={loadingMovements}
                  emptyText="No operational cash-in movements found for this drawer."
                  rows={operationalCashInRows}
                  total={operationalCashInTotal}
                />

                <MovementSummaryPanel
                  title="Operational Cash Out"
                  subtitle="Deducted from physical drawer cash position."
                  loading={loadingMovements}
                  emptyText="No operational cash-out movements found for this drawer."
                  rows={operationalCashOutRows}
                  total={operationalCashOutTotal}
                />
              </section>

              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <MovementSummaryPanel
                  title="Management Adjustments"
                  subtitle="Visible for reporting, excluded from physical drawer cash."
                  loading={loadingMovements}
                  emptyText="No management adjustments found for this drawer."
                  rows={managementAdjustmentRows}
                  total={managementAdjustmentTotal}
                  infoTone
                />

                <MovementSummaryPanel
                  title="Non-Cash Collections"
                  subtitle="Collected through non-cash channels, not inside the drawer."
                  loading={loadingMovements}
                  emptyText="No non-cash collections found for this drawer."
                  rows={nonCashCollectionRows}
                  total={nonCashCollectionTotal}
                  infoTone
                />
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  OPSCORE Cash Formula
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <FormulaMetric label="Opening Float" value={peso(openingFloat)} />
                  <FormulaMetric label="+ Operational In" value={peso(operationalCashInTotal)} />
                  <FormulaMetric label="- Operational Out" value={peso(operationalCashOutTotal)} />
                  <FormulaMetric
                    label="Expected From Movements"
                    value={peso(expectedFromMovements)}
                  />
                </div>

                <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold leading-6 text-blue-700">
                  Management adjustments and non-cash collections are displayed for transparency but excluded from physical drawer cash position.
                </p>

                {expected > 0 && Math.abs(formulaDifference) > 0.01 && (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-700">
                    Formula check: Drawer expected cash is {peso(expected)}, but movement formula shows {peso(expectedFromMovements)}.
                    Difference: {peso(Math.abs(formulaDifference))}. Review opening float, backfilled movements, or drawer close computation.
                  </p>
                )}
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Money Story
                </p>
                <p className="mt-4 text-base font-bold leading-8 text-slate-800">
                  {buildMoneyStory(
                    expected,
                    actual,
                    variance,
                    recordedTurnover,
                    operationalCashInTotal,
                    operationalCashOutTotal,
                    managementAdjustmentTotal,
                    nonCashCollectionTotal,
                    expectedFromMovements,
                    formulaDifference
                  )}
                </p>
              </section>
            </>
          ) : (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Watcher Story
              </p>
              <p className="mt-4 text-base font-bold leading-8 text-slate-800">
                {finding.finding}
              </p>
            </section>
          )}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Recommendation
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
              {finding.recommendation || "Review finding details and supporting evidence."}
            </p>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Manager Review
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Investigation Notes
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Add the manager conclusion before moving this finding to the Reviewed tab.
                </p>
              </div>

              {(finding.review_status || "FOR_REVIEW") === "REVIEWED" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Reviewed by {finding.reviewed_by_name || "OPSCORE User"}
                  {finding.reviewed_at ? ` • ${formatDateTime(finding.reviewed_at)}` : ""}
                </div>
              )}
            </div>

            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              disabled={(finding.review_status || "FOR_REVIEW") === "REVIEWED"}
              placeholder="Example: Verified with drawer holder. Missing turnover was confirmed and will be settled."
              className="mt-5 min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowEvidence((current) => !current)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-slate-600" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Evidence
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    Raw supporting fields for auditor review
                  </p>
                </div>
              </div>

              {showEvidence ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showEvidence && (
              <div className="border-t border-slate-100 p-6">
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(evidence).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        {key.replaceAll("_", " ")}
                      </p>
                      <p className="break-words text-right text-sm font-black text-slate-950">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              Close
            </button>
            {(finding.review_status || "FOR_REVIEW") !== "REVIEWED" && (
              <button
                type="button"
                onClick={markReviewed}
                disabled={savingReview}
                className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingReview ? "Saving..." : "Mark Reviewed"}
              </button>
            )}

            <button
              type="button"
              className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              Export Investigation Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMoneyStory(
  expected: number,
  actual: number,
  variance: number,
  turnover: number,
  operationalCashInTotal: number,
  operationalCashOutTotal: number,
  managementAdjustmentTotal: number,
  nonCashCollectionTotal: number,
  expectedFromMovements: number,
  formulaDifference: number
) {
  if (expected <= 0) {
    return `The drawer was closed with a variance of ${peso(
      Math.abs(variance)
    )}. Watcher could not compute the expected cash from stored drawer fields, so the drawer movements and closing remarks should be reviewed.`;
  }

  const formulaNote =
    Math.abs(formulaDifference) > 0.01
      ? ` Formula check shows expected from movements of ${peso(
          expectedFromMovements
        )}, which differs from drawer expected cash by ${peso(
          Math.abs(formulaDifference)
        )}.`
      : "";

  return `This drawer had operational cash-in of ${peso(
    operationalCashInTotal
  )} and operational cash-out of ${peso(
    operationalCashOutTotal
  )}. Management adjustments of ${peso(
    managementAdjustmentTotal
  )} and non-cash collections of ${peso(
    nonCashCollectionTotal
  )} are shown for transparency but excluded from physical drawer cash. Expected from movements is ${peso(
    expectedFromMovements
  )}. The drawer was expected to contain ${peso(
    expected
  )} at closing. Only ${peso(actual)} was counted. The recorded turnover appears to be ${peso(
    turnover
  )}. OPSCORE Watcher detected a shortage of ${peso(
    Math.abs(variance)
  )}.${formulaNote} This suggests a possible missing turnover, unrecorded payout, or cash release that still needs management review.`;
}

function groupMovements(
  movements: CashMovement[],
  movementType: string,
  predicate?: (movement: CashMovement) => boolean
): [string, string][] {
  const grouped = new Map<string, number>();

  movements
    .filter((m) => String(m.movement_type || "") === movementType)
    .filter((m) => (predicate ? predicate(m) : true))
    .forEach((m) => {
      const source = m.source || "Uncategorized";
      grouped.set(source, (grouped.get(source) || 0) + Number(m.amount || 0));
    });

  return Array.from(grouped.entries()).map(([source, total]) => [
    source,
    peso(total),
  ]);
}

function sumMovementType(
  movements: CashMovement[],
  movementType: string,
  predicate?: (movement: CashMovement) => boolean
) {
  return movements
    .filter((m) => String(m.movement_type || "") === movementType)
    .filter((m) => (predicate ? predicate(m) : true))
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);
}

function normalizeValue(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isManagementAdjustmentMovement(movement: CashMovement) {
  return MANAGEMENT_ADJUSTMENT_PAYMENT_TYPES.includes(
    normalizeValue(movement.payment_type)
  );
}

function isNonCashMovement(movement: CashMovement) {
  return NON_CASH_PAYMENT_TYPES.includes(normalizeValue(movement.payment_type));
}

function isOperationalCashMovement(movement: CashMovement) {
  return !isManagementAdjustmentMovement(movement) && !isNonCashMovement(movement);
}

function extractNumberFromRemarks(text: string, label: string) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index === -1) return 0;

  const slice = text.slice(index, index + 90);
  const match = slice.match(/₱?\s*([\d,]+(\.\d{1,2})?)/);

  if (!match) return 0;

  return Number(match[1].replaceAll(",", ""));
}

function getBusinessDate(finding: WatcherFinding, evidence: any) {
  const direct =
    finding.business_date ||
    evidence.business_date ||
    evidence.drawer_business_date ||
    "";

  if (direct) {
    return String(direct).slice(0, 10);
  }

  const fallback = evidence.closed_at || evidence.opened_at || finding.created_at;
  if (!fallback) return "";

  const date = new Date(fallback);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | undefined | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value: string | undefined | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanTitle(finding: WatcherFinding) {
  if (finding.title.includes("Traceability")) {
    return "Broken Financial Audit Trail";
  }

  if (finding.title.includes("Cash drawer variance")) {
    const holder = finding.evidence?.drawer_holder;
    const variance = Number(finding.evidence?.variance || finding.financial_impact || 0);
    const direction = variance < 0 ? "Missing Cash" : "Cash Overage";
    return holder ? `${direction} — ${holder}` : direction;
  }

  return finding.title;
}

function formatImpact(finding: WatcherFinding) {
  if (finding.title.includes("Traceability")) {
    return `${Number(finding.financial_impact || 0).toLocaleString()} affected records`;
  }

  return peso(finding.financial_impact);
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
        Live
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "CRITICAL"
      ? "border-red-200 bg-red-50 text-red-700"
      : severity === "REVIEW"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${cls}`}>
      {severity}
    </span>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "info";
}) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-3xl border p-5 ${cls}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function BigMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        danger
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-950"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function FormulaMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MovementSummaryPanel({
  title,
  subtitle,
  loading,
  emptyText,
  rows,
  total,
  infoTone,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  emptyText: string;
  rows: [string, string][];
  total: number;
  infoTone?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      {subtitle && (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {subtitle}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm font-bold text-slate-500">
          Loading movement summary...
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-sm font-bold text-slate-600">{label}</p>
              <p className="text-sm font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div
        className={`mt-4 rounded-2xl border px-4 py-4 ${
          infoTone
            ? "border-blue-200 bg-blue-50"
            : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Total
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950">
          {loading ? "Loading..." : peso(total)}
        </p>
      </div>
    </div>
  );
}


