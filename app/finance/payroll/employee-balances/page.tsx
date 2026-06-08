"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import PageGuard from "@/components/PageGuard";

type PermissionSet = {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_approve?: boolean;
  can_release?: boolean;
};

type EmployeeBalance = {
  id: string;
  employee_id?: string | null;
  employee_name?: string | null;
  balance_type?: string | null;
  original_amount?: number | null;
  remaining_balance?: number | null;
  status?: string | null;
  source_module?: string | null;
  source_id?: string | null;
  period_id?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
};

type Employee = {
  id: string;
  employee_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status?: string | null;
};

const MODULE_KEY = "employee_balances";

export default function EmployeeBalancesPage() {
  /// STATES
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permissions, setPermissions] = useState<PermissionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("ALL");
  const [selectedBalance, setSelectedBalance] = useState<EmployeeBalance | null>(null);

  /// HELPERS
  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return String(value).slice(0, 19).replace("T", " ");
  };

  const normalize = (value: any) => String(value || "").trim();
  const normalizeLower = (value: any) => normalize(value).toLowerCase();

  const getEmployeeName = (employee: Employee) =>
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.employee_no ||
    "Unnamed Employee";

  const getStatusStyle = (status: any) => {
    const normalized = normalizeLower(status || "Active");

    if (["active", "open"].includes(normalized)) return "bg-amber-500/10 text-amber-300";
    if (["paid", "closed", "settled"].includes(normalized)) return "bg-emerald-500/10 text-emerald-300";
    if (["cancelled", "canceled", "void", "reversed"].includes(normalized)) return "bg-red-500/10 text-red-300";
    return "bg-slate-700 text-slate-300";
  };

  const getTypeStyle = (type: any) => {
    const normalized = normalizeLower(type);

    if (normalized.includes("cash advance")) return "bg-purple-500/10 text-purple-300";
    if (normalized.includes("payroll balance")) return "bg-blue-500/10 text-blue-300";
    if (normalized.includes("carry")) return "bg-red-500/10 text-red-300";
    return "bg-slate-700 text-slate-300";
  };

  const getUserName = () =>
    localStorage.getItem("opscore_current_user_name") ||
    localStorage.getItem("opscore_current_employee_name") ||
    localStorage.getItem("opscore_username") ||
    "OPSCORE USER";

  /// PERMISSIONS
  const getPermissions = async () => {
    const roleId = localStorage.getItem("opscore_current_role_id");
    const roleName = localStorage.getItem("opscore_current_role_name");

    if (!roleId && !roleName) {
      setPermissions({ can_view: true });
      return;
    }

    let query = supabase
      .from("role_permissions")
      .select("*")
      .eq("module_key", MODULE_KEY);

    if (roleId) {
      query = query.eq("role_id", roleId);
    } else if (roleName) {
      query = query.eq("role_name", roleName);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.log("GET EMPLOYEE BALANCES PERMISSIONS ERROR:", error.message);
      setPermissions({ can_view: true });
      return;
    }

    setPermissions(data || { can_view: true });
  };

  const deny = () => {
    alert("Access denied.");
  };

  /// LOADERS
  const loadData = async () => {
    setLoading(true);

    const [balanceResult, employeeResult] = await Promise.all([
      supabase
        .from("employee_balances")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_no, first_name, last_name, department, position, employment_status")
        .order("first_name", { ascending: true }),
    ]);

    if (balanceResult.error) {
      console.log("GET EMPLOYEE BALANCES ERROR:", balanceResult.error.message);
    }

    if (employeeResult.error) {
      console.log("GET EMPLOYEES ERROR:", employeeResult.error.message);
    }

    setBalances(balanceResult.data || []);
    setEmployees(employeeResult.data || []);
    setLoading(false);
  };

  /// ACTIONS
  const markAsPaid = async (balance: EmployeeBalance) => {
    if (!permissions?.can_edit) {
      deny();
      return;
    }

    if (normalizeLower(balance.status) !== "active") {
      alert("Only active balances can be marked as paid.");
      return;
    }

    const confirmed = confirm(
      `Mark this balance as paid?\n\n${balance.employee_name || "Employee"}\n${balance.balance_type || "Balance"}\nRemaining: ${formatPeso(balance.remaining_balance)}`,
    );

    if (!confirmed) return;

    const payload = {
      remaining_balance: 0,
      status: "Paid",
      remarks: `${balance.remarks || ""} | Marked paid from Employee Balances on ${new Date().toISOString()}.`.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("employee_balances")
      .update(payload)
      .eq("id", balance.id);

    if (error) {
      console.log("MARK BALANCE PAID ERROR:", error.message);
      alert("Failed to mark balance as paid.");
      return;
    }

    await createAuditLog({
      userName: getUserName(),
      module: "Employee Balances",
      action: "Mark Balance Paid",
      description: `${balance.employee_name || "Employee"} ${balance.balance_type || "balance"} marked as paid - ${formatPeso(balance.remaining_balance)}`,
      severity: "warning",
      recordId: balance.id,
      oldValue: balance,
      newValue: payload,
    });

    await loadData();
  };

  const cancelBalance = async (balance: EmployeeBalance) => {
    if (!permissions?.can_delete) {
      deny();
      return;
    }

    if (normalizeLower(balance.status) !== "active") {
      alert("Only active balances can be cancelled.");
      return;
    }

    const reason = prompt("Reason for cancelling this balance?");
    if (!reason?.trim()) {
      alert("Cancel reason is required.");
      return;
    }

    const confirmed = confirm(
      `Cancel this balance?\n\n${balance.employee_name || "Employee"}\n${balance.balance_type || "Balance"}\nRemaining: ${formatPeso(balance.remaining_balance)}`,
    );

    if (!confirmed) return;

    const payload = {
      remaining_balance: 0,
      status: "Cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.trim(),
      remarks: `${balance.remarks || ""} | Cancelled from Employee Balances. Reason: ${reason.trim()}.`.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("employee_balances")
      .update(payload)
      .eq("id", balance.id);

    if (error) {
      console.log("CANCEL BALANCE ERROR:", error.message);
      alert("Failed to cancel balance.");
      return;
    }

    await createAuditLog({
      userName: getUserName(),
      module: "Employee Balances",
      action: "Cancel Balance",
      description: `${balance.employee_name || "Employee"} ${balance.balance_type || "balance"} cancelled - ${formatPeso(balance.remaining_balance)}. Reason: ${reason.trim()}`,
      severity: "critical",
      recordId: balance.id,
      oldValue: balance,
      newValue: payload,
    });

    await loadData();
  };

  /// EFFECTS
  useEffect(() => {
    getPermissions();
    loadData();
  }, []);

  /// CALCULATIONS
  const typeOptions = useMemo(() => {
    return Array.from(new Set(balances.map((item) => item.balance_type || "Balance"))).sort();
  }, [balances]);

  const sourceOptions = useMemo(() => {
    return Array.from(new Set(balances.map((item) => item.source_module || "Unknown"))).sort();
  }, [balances]);

  const employeeOptions = useMemo(() => {
    return Array.from(new Set(balances.map((item) => item.employee_name || "Unknown Employee"))).sort();
  }, [balances]);

  const filteredBalances = useMemo(() => {
    return balances.filter((item) => {
      const search = searchTerm.toLowerCase();
      const rowText = `${item.employee_name || ""} ${item.balance_type || ""} ${item.status || ""} ${item.source_module || ""} ${item.remarks || ""}`.toLowerCase();

      const matchesSearch = rowText.includes(search);
      const matchesStatus = statusFilter === "ALL" || normalizeLower(item.status || "Active") === normalizeLower(statusFilter);
      const matchesType = typeFilter === "ALL" || item.balance_type === typeFilter;
      const matchesSource = sourceFilter === "ALL" || item.source_module === sourceFilter;
      const matchesEmployee = selectedEmployeeName === "ALL" || item.employee_name === selectedEmployeeName;

      return matchesSearch && matchesStatus && matchesType && matchesSource && matchesEmployee;
    });
  }, [balances, searchTerm, statusFilter, typeFilter, sourceFilter, selectedEmployeeName]);

  const activeBalances = balances.filter((item) => normalizeLower(item.status || "Active") === "active");
  const paidBalances = balances.filter((item) => normalizeLower(item.status) === "paid");
  const cancelledBalances = balances.filter((item) => ["cancelled", "canceled"].includes(normalizeLower(item.status)));

  const totalOutstanding = activeBalances.reduce(
    (sum, item) => sum + Number(item.remaining_balance || 0),
    0,
  );

  const cashAdvanceOutstanding = activeBalances
    .filter((item) => normalizeLower(item.balance_type).includes("cash advance"))
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const payrollBalanceOutstanding = activeBalances
    .filter((item) => normalizeLower(item.balance_type).includes("payroll balance"))
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const carryForwardOutstanding = activeBalances
    .filter((item) => normalizeLower(item.balance_type).includes("carry"))
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const employeeSummary = useMemo(() => {
    const map = new Map<string, any>();

    balances.forEach((item) => {
      const name = item.employee_name || "Unknown Employee";
      const current = map.get(name) || {
        employeeName: name,
        activeCount: 0,
        paidCount: 0,
        cancelledCount: 0,
        outstanding: 0,
        originalTotal: 0,
        rows: [],
      };

      current.rows.push(item);
      current.originalTotal += Number(item.original_amount || 0);

      if (normalizeLower(item.status || "Active") === "active") {
        current.activeCount += 1;
        current.outstanding += Number(item.remaining_balance || 0);
      } else if (normalizeLower(item.status) === "paid") {
        current.paidCount += 1;
      } else if (["cancelled", "canceled"].includes(normalizeLower(item.status))) {
        current.cancelledCount += 1;
      }

      map.set(name, current);
    });

    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
  }, [balances]);

 
  
  /// UI
return (
  <PageGuard moduleKey="employee_balances">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Control
            </p>
            <h1 className="mt-2 text-4xl font-black">Employee Balances</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Monitor cash advances, payroll balances, carry-forward amounts, and employee liabilities without touching the payroll release flow.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard icon={<WalletCards size={22} />} title="Active Balances" value={activeBalances.length} danger={activeBalances.length > 0} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Outstanding" value={formatPeso(totalOutstanding)} danger={totalOutstanding > 0} />
          <KpiCard icon={<ClipboardList size={22} />} title="Cash Advance" value={formatPeso(cashAdvanceOutstanding)} />
          <KpiCard icon={<FileText size={22} />} title="Payroll Balance" value={formatPeso(payrollBalanceOutstanding)} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Carry Forward" value={formatPeso(carryForwardOutstanding)} danger={carryForwardOutstanding > 0} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Paid / Closed" value={paidBalances.length} success />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employee, type, source, remarks..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-9 py-2 text-sm outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={selectedEmployeeName}
              onChange={(event) => setSelectedEmployeeName(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none xl:col-span-2"
            >
              <option value="ALL">All Employees</option>
              {employeeOptions.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400 xl:col-span-3">
              Showing <span className="font-black text-white">{filteredBalances.length}</span> balance record(s). Cancel and paid actions are guarded by role permissions.
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Balance Ledger</h2>
                <p className="text-sm text-slate-400">Official employee balance records from Supabase.</p>
              </div>
              <ShieldCheck className="text-amber-400" size={24} />
            </div>

            <div className="max-h-[680px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1250px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((balance) => {
                    const isActive = normalizeLower(balance.status || "Active") === "active";

                    return (
                      <tr key={balance.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <p className="font-black text-white">{balance.employee_name || "Unknown Employee"}</p>
                          <p className="text-xs text-slate-500">{balance.employee_id || "No employee ID"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeStyle(balance.balance_type)}`}>
                            {balance.balance_type || "Balance"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatPeso(balance.original_amount)}</td>
                        <td className="px-4 py-3 text-right font-black text-amber-300">{formatPeso(balance.remaining_balance)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(balance.status)}`}>
                            {balance.status || "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p>{balance.source_module || "-"}</p>
                          <p className="break-all text-xs text-slate-600">{balance.source_id || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(balance.created_at)}</td>
                        <td className="max-w-[280px] px-4 py-3 text-slate-400">
                          <p className="line-clamp-3">{balance.remarks || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => setSelectedBalance(balance)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800"
                            >
                              <Eye size={13} /> View
                            </button>

                            {isActive && permissions?.can_edit && (
                              <button
                                onClick={() => markAsPaid(balance)}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold hover:bg-emerald-500"
                              >
                                Mark Paid
                              </button>
                            )}

                            {isActive && permissions?.can_delete && (
                              <button
                                onClick={() => cancelBalance(balance)}
                                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBalances.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-14 text-center text-slate-500">
                        No employee balance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-black">Employee Summary</h2>
            <p className="mt-1 text-sm text-slate-400">Employees ranked by active outstanding balance.</p>

            <div className="mt-5 max-h-[680px] space-y-3 overflow-auto pr-1">
              {employeeSummary.slice(0, 50).map((employee) => (
                <button
                  key={employee.employeeName}
                  onClick={() => setSelectedEmployeeName(employee.employeeName)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:bg-slate-800/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{employee.employeeName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Active {employee.activeCount} • Paid {employee.paidCount} • Cancelled {employee.cancelledCount}
                      </p>
                    </div>
                    <p className={employee.outstanding > 0 ? "font-black text-amber-300" : "font-black text-emerald-300"}>
                      {formatPeso(employee.outstanding)}
                    </p>
                  </div>
                </button>
              ))}

              {employeeSummary.length === 0 && (
                <div className="rounded-xl bg-slate-950 p-6 text-center text-sm text-slate-500">
                  No employee summary available.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {selectedBalance && (
        <BalanceDrawer
          balance={selectedBalance}
          onClose={() => setSelectedBalance(null)}
          formatPeso={formatPeso}
          formatDate={formatDate}
          getStatusStyle={getStatusStyle}
          getTypeStyle={getTypeStyle}
        />
      )}
        </div>
  </PageGuard>
  );
}

function KpiCard({
  icon,
  title,
  value,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/20 bg-red-500/10"
          : success
            ? "border-emerald-500/20 bg-emerald-500/10"
            : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-slate-950 p-3 text-amber-400">{icon}</div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="break-words text-2xl font-black text-white">{value}</h2>
    </div>
  );
}

function BalanceDrawer({
  balance,
  onClose,
  formatPeso,
  formatDate,
  getStatusStyle,
  getTypeStyle,
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
                Balance Details
              </p>
              <h2 className="mt-2 text-3xl font-black">{balance.employee_name || "Unknown Employee"}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeStyle(balance.balance_type)}`}>
                  {balance.balance_type || "Balance"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(balance.status)}`}>
                  {balance.status || "Active"}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl bg-slate-900 p-3 text-slate-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailCard label="Original Amount" value={formatPeso(balance.original_amount)} />
            <DetailCard label="Remaining Balance" value={formatPeso(balance.remaining_balance)} highlight />
            <DetailCard label="Source Module" value={balance.source_module || "-"} />
            <DetailCard label="Period ID" value={balance.period_id || "-"} />
            <DetailCard label="Created" value={formatDate(balance.created_at)} />
            <DetailCard label="Updated" value={formatDate(balance.updated_at)} />
          </section>

          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Reference</h3>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Employee ID" value={balance.employee_id || "-"} />
              <InfoRow label="Source ID" value={balance.source_id || "-"} />
              <InfoRow label="Cancelled At" value={formatDate(balance.cancelled_at)} />
              <InfoRow label="Cancel Reason" value={balance.cancel_reason || "-"} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black">Remarks / Ledger Notes</h3>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
              {balance.remarks || "No remarks saved."}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DetailCard({ label, value, highlight }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className={`mt-2 break-words text-xl font-black ${highlight ? "text-amber-300" : "text-white"}`}>
        {value}
      </h3>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 rounded-xl bg-slate-950 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="break-all font-semibold text-slate-200">{value}</span>
    </div>
  );
}
