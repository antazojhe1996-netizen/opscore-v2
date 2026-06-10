"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Brain,
  CheckCircle2,
  ClipboardList,
  Hotel,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type AuditLevel = "Excellent" | "Good" | "Needs Attention" | "Critical";

type AuditIssue = {
  area: string;
  title: string;
  details: string;
  severity: "low" | "medium" | "high";
  action: string;
};

type ScoreCardData = {
  title: string;
  score: number;
  icon: ReactNode;
  description: string;
  issues: AuditIssue[];
};

export default function AuditCenterPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [hotelReservations, setHotelReservations] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /// HELPERS
  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getRowsFromTable = async (tableName: string) => {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error) {
      console.log(`AUDIT LOAD ${tableName} ERROR:`, error.message);
      return [];
    }

    return data || [];
  };

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

  const getDateValue = (row: any) =>
    String(
      row.business_date ||
        row.attendance_date ||
        row.schedule_date ||
        row.due_date ||
        row.check_in ||
        row.date ||
        row.created_at ||
        row.opened_at ||
        row.closed_at ||
        ""
    ).slice(0, 10);

  const getDaysLeft = (dateValue: string | null) => {
    if (!dateValue) return null;

    const target = new Date(`${dateValue}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);

    if (Number.isNaN(target.getTime())) return null;

    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDrawerVariance = (drawer: any) => {
    const saved = drawer.variance ?? drawer.cash_variance ?? drawer.difference;

    if (saved !== undefined && saved !== null) return Number(saved || 0);

    const actual = Number(drawer.actual_cash ?? drawer.actual_amount ?? 0);
    const expected = Number(drawer.expected_cash ?? drawer.expected_amount ?? 0);

    return actual - expected;
  };

  const getScoreFromDeductions = (deductions: number) =>
    Math.max(0, Math.min(100, 100 - deductions));

  const getAuditLevel = (score: number): AuditLevel => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Good";
    if (score >= 70) return "Needs Attention";
    return "Critical";
  };

  const getLevelClass = (level: AuditLevel) => {
    if (level === "Excellent" || level === "Good") {
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    }

    if (level === "Needs Attention") {
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    }

    return "border-blue-500/30 bg-blue-500/10 text-blue-200";
  };

  const getSeverityClass = (severity: AuditIssue["severity"]) => {
    if (severity === "high") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    if (severity === "medium") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  };

  /// LOADERS
  const loadAuditData = async () => {
    setLoading(true);

    const [
      employeesData,
      schedulesData,
      attendanceData,
      payrollData,
      payrollAdjustmentsData,
      billsData,
      drawerData,
      reservationData,
      occupancyRows,
      leaveData,
    ] = await Promise.all([
      getRowsFromTable("employees"),
      getRowsFromTable("schedules"),
      getRowsFromTable("attendance_entries"),
      getRowsFromTable("payroll_records"),
      getRowsFromTable("payroll_adjustments"),
      getRowsFromTable("finance_bills"),
      getRowsFromTable("finance_cash_drawers"),
      getRowsFromTable("finance_hotel_reservations"),
      getRowsFromTable("occupancy_data"),
      getRowsFromTable("leave_requests"),
    ]);

    setEmployees(employeesData);
    setSchedules(schedulesData);
    setAttendanceEntries(attendanceData);
    setPayrollRecords(payrollData);
    setPayrollAdjustments(payrollAdjustmentsData);
    setBills(billsData);
    setCashDrawers(drawerData);
    setHotelReservations(reservationData);
    setOccupancyData(occupancyRows);
    setLeaveRequests(leaveData);
    setLoading(false);
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  /// CALCULATIONS
  const audit = useMemo(() => {
    const activeEmployees = employees.filter(
      (employee) => normalize(employee.employment_status || "Active") === "active"
    );

    const payrollActiveEmployees = activeEmployees.filter(
      (employee) => employee.payroll_active !== false
    );

    const openDrawers = cashDrawers.filter((drawer) =>
      ["open", "active", "pending"].includes(normalize(drawer.status || drawer.drawer_status))
    );

    const drawerVarianceRows = cashDrawers.filter(
      (drawer) => Math.abs(getDrawerVariance(drawer)) > 0
    );

    const totalDrawerVariance = drawerVarianceRows.reduce(
      (sum, drawer) => sum + Math.abs(getDrawerVariance(drawer)),
      0
    );

    const unpaidBills = bills.filter((bill) => {
      const status = normalize(bill.status);
      return status !== "paid" && status !== "cancelled";
    });

    const overdueBills = unpaidBills.filter((bill) => {
      const daysLeft = getDaysLeft(getDateValue(bill));
      return daysLeft !== null && daysLeft < 0;
    });

    const overdueBillsTotal = overdueBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    const unpaidReservations = hotelReservations.filter(
      (row) => Number(row.balance_due || 0) > 0
    );

    const unpaidGuestBalance = unpaidReservations.reduce(
      (sum, row) => sum + Number(row.balance_due || 0),
      0
    );

    const missingBookingSource = hotelReservations.filter(
      (row) => !row.booking_source || normalize(row.booking_source) === "needs review"
    );

    const missingRoomType = hotelReservations.filter(
      (row) => !row.room_type || normalize(row.room_type) === "needs review"
    );

    const negativeRevenue = hotelReservations.filter(
      (row) => Number(row.amount_paid || row.grand_total || 0) < 0
    );

    const employeesWithoutDepartment = activeEmployees.filter(
      (employee) => !employee.department
    );

    const employeesWithoutPosition = activeEmployees.filter((employee) => !employee.position);

    const employeesWithoutRate = payrollActiveEmployees.filter(
      (employee) => Number(employee.basic_rate || employee.daily_rate || 0) <= 0
    );

    const todaySchedules = schedules.filter((row) => getDateValue(row) === todayKey);
    const todayAttendance = attendanceEntries.filter((row) => getDateValue(row) === todayKey);

    const missingTodayAttendance = todaySchedules.filter((schedule) => {
      const employeeId = schedule.employee_id || schedule.employee_no;
      const scheduleText = `${schedule.status || ""} ${schedule.shift || ""} ${schedule.shift_name || ""}`.toLowerCase();

      if (scheduleText.includes("off") || scheduleText.includes("rest") || scheduleText.includes("rd")) {
        return false;
      }

      return !todayAttendance.some(
        (entry) =>
          String(entry.employee_id || entry.employee_no) === String(employeeId) &&
          (entry.time_in || entry.time_out || normalize(entry.status) === "present")
      );
    });

    const pendingPayrollAdjustments = payrollAdjustments.filter(
      (item) => normalize(item.status || "Pending") === "pending"
    );

    const unreleasedPayroll = payrollRecords.filter((record) =>
      ["for approval", "approved"].includes(normalize(record.status))
    );

    const negativePayroll = payrollRecords.filter(
      (record) => Number(record.net_pay || record.net_amount || record.total_pay || 0) < 0
    );

    const pendingLeaveRequests = leaveRequests.filter((request) =>
      ["pending", "for approval"].includes(normalize(request.status || "Pending"))
    );

    const latestOccupancy =
      occupancyData.find((row) => String(row.business_date).slice(0, 10) === todayKey) ||
      occupancyData[occupancyData.length - 1];

    const occupancyToday = Number(latestOccupancy?.occupancy || 0);

    const issues: AuditIssue[] = [];

    const addIssue = (issue: AuditIssue, condition: boolean) => {
      if (condition) issues.push(issue);
    };

    addIssue(
      {
        area: "Finance",
        title: `${openDrawers.length} open cash drawer(s)`,
        details: "Cash drawer must be closed before end-of-day reporting.",
        severity: "high",
        action: "Close or verify open cash drawers.",
      },
      openDrawers.length > 0
    );

    addIssue(
      {
        area: "Finance",
        title: `${formatPeso(totalDrawerVariance)} cash variance`,
        details: "Actual cash does not match expected cash.",
        severity: "high",
        action: "Review drawer remittance and receipts.",
      },
      totalDrawerVariance > 0
    );

    addIssue(
      {
        area: "Finance",
        title: `${overdueBills.length} overdue bill(s)`,
        details: `${formatPeso(overdueBillsTotal)} total overdue amount.`,
        severity: "medium",
        action: "Prioritize overdue bills before new expenses.",
      },
      overdueBills.length > 0
    );

    addIssue(
      {
        area: "Sales",
        title: `${unpaidReservations.length} unpaid reservation(s)`,
        details: `${formatPeso(unpaidGuestBalance)} guest balance needs checking.`,
        severity: unpaidGuestBalance > 50000 ? "high" : "medium",
        action: "Review unpaid rooms in Hotel Sales.",
      },
      unpaidReservations.length > 0
    );

    addIssue(
      {
        area: "Sales",
        title: `${missingBookingSource.length} missing booking source`,
        details: "Some reservations need source tagging.",
        severity: "low",
        action: "Clean up booking source in Hotel Sales import.",
      },
      missingBookingSource.length > 0
    );

    addIssue(
      {
        area: "Sales",
        title: `${missingRoomType.length} missing room type`,
        details: "Some reservations need room type review.",
        severity: "low",
        action: "Clean up room type in Hotel Sales import.",
      },
      missingRoomType.length > 0
    );

    addIssue(
      {
        area: "Sales",
        title: `${negativeRevenue.length} negative revenue row(s)`,
        details: "Negative sales rows need verification.",
        severity: "medium",
        action: "Check imported Hotel Sales data.",
      },
      negativeRevenue.length > 0
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutDepartment.length} employee(s) without department`,
        details: "Department is required for reporting and access filtering.",
        severity: "medium",
        action: "Update Employee 201 records.",
      },
      employeesWithoutDepartment.length > 0
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutPosition.length} employee(s) without position`,
        details: "Position is needed for payroll and schedule reports.",
        severity: "low",
        action: "Update Employee 201 records.",
      },
      employeesWithoutPosition.length > 0
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutRate.length} payroll employee(s) without rate`,
        details: "Payroll active employees must have rate setup.",
        severity: "high",
        action: "Add basic rate in Employee 201.",
      },
      employeesWithoutRate.length > 0
    );

    addIssue(
      {
        area: "Workforce",
        title: `${missingTodayAttendance.length} missing attendance today`,
        details: "Scheduled employees have no time entry yet.",
        severity: "medium",
        action: "Review Attendance Audit.",
      },
      missingTodayAttendance.length > 0
    );

    addIssue(
      {
        area: "Payroll",
        title: `${pendingPayrollAdjustments.length} pending payroll adjustment(s)`,
        details: "Pending deductions or earnings can affect payroll accuracy.",
        severity: "high",
        action: "Approve or reject adjustments in Payroll Register.",
      },
      pendingPayrollAdjustments.length > 0
    );

    addIssue(
      {
        area: "Payroll",
        title: `${unreleasedPayroll.length} payroll record(s) ready for release`,
        details: "Approved payroll records have not been released yet.",
        severity: "medium",
        action: "Review Payroll Manager.",
      },
      unreleasedPayroll.length > 0
    );

    addIssue(
      {
        area: "Payroll",
        title: `${negativePayroll.length} negative payroll record(s)`,
        details: "Net pay is below zero due to deductions or carry-forward.",
        severity: "medium",
        action: "Review deductions before release.",
      },
      negativePayroll.length > 0
    );

    addIssue(
      {
        area: "Operations",
        title: `${pendingLeaveRequests.length} pending leave request(s)`,
        details: "Pending leave may affect schedule coverage.",
        severity: "medium",
        action: "Approve or reject leave requests.",
      },
      pendingLeaveRequests.length > 0
    );

    addIssue(
      {
        area: "Operations",
        title: `Low occupancy at ${occupancyToday}%`,
        details: "Occupancy is below target.",
        severity: "medium",
        action: "Review sales channels and direct booking actions.",
      },
      occupancyToday > 0 && occupancyToday < 40
    );

    const financeIssues = issues.filter((issue) => issue.area === "Finance");
    const salesIssues = issues.filter((issue) => issue.area === "Sales");
    const workforceIssues = issues.filter((issue) => issue.area === "Workforce");
    const payrollIssues = issues.filter((issue) => issue.area === "Payroll");
    const operationsIssues = issues.filter((issue) => issue.area === "Operations");

    const scoreByIssues = (areaIssues: AuditIssue[]) =>
      getScoreFromDeductions(
        areaIssues.reduce((sum, issue) => {
          if (issue.severity === "high") return sum + 18;
          if (issue.severity === "medium") return sum + 10;
          return sum + 5;
        }, 0)
      );

    const financeScore = scoreByIssues(financeIssues);
    const salesScore = scoreByIssues(salesIssues);
    const workforceScore = scoreByIssues(workforceIssues);
    const payrollScore = scoreByIssues(payrollIssues);
    const operationsScore = scoreByIssues(operationsIssues);

    const overallScore = Math.round(
      financeScore * 0.25 +
        salesScore * 0.2 +
        workforceScore * 0.2 +
        payrollScore * 0.2 +
        operationsScore * 0.15
    );

    const scoreCards: ScoreCardData[] = [
      {
        title: "Finance",
        score: financeScore,
        icon: <Wallet size={22} />,
        description: "Cash, drawers, bills",
        issues: financeIssues,
      },
      {
        title: "Sales",
        score: salesScore,
        icon: <Hotel size={22} />,
        description: "Rooms, balances, sources",
        issues: salesIssues,
      },
      {
        title: "Workforce",
        score: workforceScore,
        icon: <Users size={22} />,
        description: "Employees, schedule, attendance",
        issues: workforceIssues,
      },
      {
        title: "Payroll",
        score: payrollScore,
        icon: <Banknote size={22} />,
        description: "Adjustments, release, deductions",
        issues: payrollIssues,
      },
      {
        title: "Operations",
        score: operationsScore,
        icon: <ClipboardList size={22} />,
        description: "Leave, occupancy, coverage",
        issues: operationsIssues,
      },
    ];

    const highRiskAreas = scoreCards
      .filter((card) => card.score < 85)
      .sort((a, b) => a.score - b.score);

    const immediateActions = issues
      .filter((issue) => issue.severity === "high")
      .slice(0, 5);

    return {
      issues,
      scoreCards,
      overallScore,
      overallLevel: getAuditLevel(overallScore),
      highRiskAreas,
      immediateActions,
      activeEmployees: activeEmployees.length,
      openDrawers: openDrawers.length,
      unpaidGuestBalance,
      pendingPayrollAdjustments: pendingPayrollAdjustments.length,
      pendingLeaveRequests: pendingLeaveRequests.length,
    };
  }, [
    employees,
    schedules,
    attendanceEntries,
    payrollRecords,
    payrollAdjustments,
    bills,
    cashDrawers,
    hotelReservations,
    occupancyData,
    leaveRequests,
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 lg:p-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
              OPSCORE Audit Center
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Operations Audit</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              One-page control check for finance, sales, workforce, payroll, and operations risk.
            </p>
          </div>

          <button
            onClick={loadAuditData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Audit"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className={`rounded-2xl border p-6 ${getLevelClass(audit.overallLevel)}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-950/60 p-3">
                <ShieldCheck size={28} />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide">Overall Audit Score</p>
                <h2 className="mt-1 text-5xl font-black text-white">
                  {audit.overallScore}
                </h2>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Business Status</p>
              <p className="mt-1 text-2xl font-black text-white">{audit.overallLevel}</p>
            </div>

            <p className="mt-4 text-sm text-slate-300">
              Short rule: 95+ excellent, 85+ good, 70+ needs attention, below 70 critical.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {audit.scoreCards.map((card) => (
              <ScoreCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
          <MiniStat title="Active Employees" value={audit.activeEmployees} />
          <MiniStat title="Open Drawers" value={audit.openDrawers} danger={audit.openDrawers > 0} />
          <MiniStat title="Guest Balance" value={formatPeso(audit.unpaidGuestBalance)} danger={audit.unpaidGuestBalance > 0} />
          <MiniStat title="Pending Payroll" value={audit.pendingPayrollAdjustments} danger={audit.pendingPayrollAdjustments > 0} />
        </section>

        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldAlert className="text-blue-300" size={28} />

              <div>
                <h2 className="text-2xl font-black">Needs Attention</h2>
                <p className="text-sm text-slate-400">
                  Items that may affect daily closing, payroll, sales, or operations.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {audit.issues.length > 0 ? (
                audit.issues.map((issue, index) => (
                  <IssueCard key={`${issue.area}-${issue.title}-${index}`} issue={issue} />
                ))
              ) : (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-blue-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={24} />
                    <div>
                      <h3 className="font-black">No major issue detected.</h3>
                      <p className="mt-1 text-sm text-blue-100">
                        Current audit checks are clean.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
            <div className="mb-5 flex items-center gap-3">
              <Brain className="text-blue-200" size={28} />

              <div>
                <h2 className="text-2xl font-black text-white">Audit Summary</h2>
                <p className="text-sm text-blue-100/80">Owner view</p>
              </div>
            </div>

            <div className="space-y-3">
              <SummaryRow label="Overall Score" value={`${audit.overallScore}/100`} />
              <SummaryRow label="Status" value={audit.overallLevel} />
              <SummaryRow
                label="Highest Risk"
                value={audit.highRiskAreas[0]?.title || "None"}
              />
              <SummaryRow label="Total Issues" value={audit.issues.length} />
            </div>

            <div className="mt-5 rounded-2xl bg-slate-950/60 p-4">
              <p className="mb-3 font-black text-white">Immediate Actions</p>

              {audit.immediateActions.length > 0 ? (
                <div className="space-y-2">
                  {audit.immediateActions.map((issue, index) => (
                    <div key={`${issue.title}-${index}`} className="rounded-xl bg-slate-900 p-3">
                      <p className="text-sm font-bold text-blue-200">{issue.action}</p>
                      <p className="mt-1 text-xs text-slate-400">{issue.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No urgent action. Continue monitoring daily closing and payroll.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <AlertTriangle size={16} className="text-blue-300" /> Audit V1 note
              </p>
              <p className="mt-2 text-sm text-slate-400">
                This page reads existing modules only. No new database table needed.
              </p>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function ScoreCard({ card }: { card: ScoreCardData }) {
  const level = card.score >= 95 ? "Excellent" : card.score >= 85 ? "Good" : card.score >= 70 ? "Watch" : "Critical";

  const colorClass =
    card.score >= 85
      ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
      : card.score >= 70
      ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
      : "border-blue-500/20 bg-blue-500/10 text-blue-200";

  return (
    <div className={`rounded-2xl border p-5 ${colorClass}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="rounded-full bg-slate-950/60 p-3">{card.icon}</div>
        <span className="rounded-full bg-slate-950/50 px-3 py-1 text-xs font-black">
          {level}
        </span>
      </div>

      <p className="text-sm text-slate-300">{card.title}</p>
      <h3 className="mt-1 text-3xl font-black text-white">{card.score}</h3>
      <p className="mt-1 text-xs text-slate-400">{card.description}</p>

      <div className="mt-4 rounded-xl bg-slate-950/50 px-3 py-2 text-xs font-bold text-white">
        {card.issues.length} issue(s)
      </div>
    </div>
  );
}

function MiniStat({ title, value, danger }: { title: string; value: any; danger?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-blue-500/20 bg-blue-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-400">{title}</p>
      <h3 className={`mt-2 text-2xl font-black ${danger ? "text-blue-200" : "text-white"}`}>
        {value}
      </h3>
    </div>
  );
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const severityClass =
    issue.severity === "high"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : issue.severity === "medium"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : "border-blue-500/30 bg-blue-500/10 text-blue-300";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
              {issue.area}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${severityClass}`}>
              {issue.severity.toUpperCase()}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black text-white">{issue.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{issue.details}</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-sm text-slate-200 lg:w-72">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Action</p>
          <p className="mt-1 font-semibold">{issue.action}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-950/60 px-4 py-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-black text-white">{value}</p>
    </div>
  );
}
