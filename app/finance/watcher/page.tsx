"use client";

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
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

type WatcherFinding = {
  id: string;
  severity: string;
  status: string;
  entity_type: string;
  title: string;
  finding: string;
  recommendation: string | null;
  financial_impact: number | null;
  evidence: any;
  created_at: string;
};

const peso = (value: number | null | undefined) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function FinancialWatcherPage() {
  const [findings, setFindings] = useState<WatcherFinding[]>([]);
  const [selected, setSelected] = useState<WatcherFinding | null>(null);
  const [investigation, setInvestigation] = useState<WatcherFinding | null>(null);
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
      setFindings(data || []);
      setSelected(data?.[0] || null);
    }

    setLoading(false);
  }

  const stats = useMemo(() => {
    const critical = findings.filter((f) => f.severity === "CRITICAL").length;
    const review = findings.filter((f) => f.severity === "REVIEW").length;
    const exposure = findings.reduce(
      (sum, f) => sum + Number(f.financial_impact || 0),
      0
    );

    return { critical, review, exposure, total: findings.length };
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
            <KpiCard label="Needs Review" value={stats.review} tone="warning" />
            <KpiCard label="Open Findings" value={stats.total} tone="info" />
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
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="py-14 text-center text-sm font-semibold text-slate-500">
                    Loading watcher findings...
                  </div>
                ) : findings.length === 0 ? (
                  <div className="py-14 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                    <p className="mt-3 text-sm font-black text-slate-950">
                      No open financial findings.
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Financial Watcher did not find unresolved issues.
                    </p>
                  </div>
                ) : (
                  findings.map((finding) => (
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
          />
        )}
      </div>
    </PageGuard>
  );
}

function InvestigationDrawer({
  finding,
  onClose,
}: {
  finding: WatcherFinding;
  onClose: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);

  const evidence = finding.evidence || {};
  const isDrawerVariance = finding.entity_type === "CASH_DRAWER";

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

  const recordedTurnover =
    extractNumberFromRemarks(String(evidence.remarks || ""), "Cash Turnover Out") ||
    extractNumberFromRemarks(String(evidence.remarks || ""), "Actual Cash") ||
    actual;

  const turnoverDifference =
    expected > 0 ? Math.abs(expected - Number(recordedTurnover || 0)) : Math.abs(variance);

  const businessDate = formatDate(evidence.closed_at || evidence.opened_at);
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
                    value={peso(recordedTurnover)}
                    tone="warning"
                  />
                  <SummaryCard
                    label="Turnover Gap"
                    value={peso(turnoverDifference)}
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
                <CashSummaryPanel
                  title="Cash In Summary"
                  rows={[
                    ["Opening Float", peso(openingFloat)],
                    ["Cash Sales / Collections", "Pending source breakdown"],
                    ["Cash Turnover Received", "Pending source breakdown"],
                    ["Expense Returns", "Pending source breakdown"],
                  ]}
                  note="Detailed source breakdown will be generated from cash movements in the next Watcher rule."
                />

                <CashSummaryPanel
                  title="Cash Out Summary"
                  rows={[
                    ["Cash Expenses / Releases", "Pending movement breakdown"],
                    ["Cash Advances", "Pending movement breakdown"],
                    ["Owner Withdrawal", "Pending movement breakdown"],
                    ["Bank Deposit / Others", "Pending movement breakdown"],
                  ]}
                  note="Detailed cash-out breakdown will be generated from linked movements."
                />
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Money Story
                </p>
                <p className="mt-4 text-base font-bold leading-8 text-slate-800">
                  {buildMoneyStory(expected, actual, variance, recordedTurnover)}
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
  turnover: number
) {
  if (expected <= 0) {
    return `The drawer was closed with a variance of ${peso(
      Math.abs(variance)
    )}. Watcher could not compute the expected cash from stored drawer fields, so the drawer movements and closing remarks should be reviewed.`;
  }

  return `This drawer was expected to contain ${peso(
    expected
  )} at closing. Only ${peso(actual)} was counted. The recorded turnover or closing cash appears to be ${peso(
    turnover
  )}. OPSCORE Watcher detected a shortage of ${peso(
    Math.abs(variance)
  )}. This suggests a possible missing turnover, unrecorded payout, or cash release that still needs management review.`;
}

function extractNumberFromRemarks(text: string, label: string) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index === -1) return 0;

  const slice = text.slice(index, index + 90);
  const match = slice.match(/₱?\s*([\d,]+(\.\d{1,2})?)/);

  if (!match) return 0;

  return Number(match[1].replaceAll(",", ""));
}

function formatDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

function CashSummaryPanel({
  title,
  rows,
  note,
}: {
  title: string;
  rows: [string, string][];
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

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

      <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700">
        {note}
      </p>
    </div>
  );
}