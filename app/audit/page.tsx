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
import TopNavbar from "@/components/TopNavbar";
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

    return Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
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
      ["open", "active", "pending"].includes(
        normalize(drawer.status || drawer.drawer_status)
      )
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
      (row) =>
        !row.booking_source || normalize(row.booking_source) === "needs review"
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

    const employeesWithoutPosition = activeEmployees.filter(
      (employee) => !employee.position
    );

    const employeesWithoutRate = payrollActiveEmployees.filter(
      (employee) => Number(employee.basic_rate || employee.daily_rate || 0) <= 0
    );

    const todaySchedules = schedules.filter((row) => getDateValue(row) === todayKey);
    const todayAttendance = attendanceEntries.filter(
      (row) => getDateValue(row) === todayKey
    );

    const missingTodayAttendance = todaySchedules.filter((schedule) => {
      const employeeId = schedule.employee_id || schedule.employee_no;
      const scheduleText = `${schedule.status || ""} ${schedule.shift || ""} ${
        schedule.shift_name || ""
      }`.toLowerCase();

      if (
        scheduleText.includes("off") ||
        scheduleText.includes("rest") ||
        scheduleText.includes("rd")
      ) {
        return false;
      }

      return !todayAttendance.some(
        (entry) =>
          String(entry.employee_id || entry.employee_no) === String(employeeId) &&
          (entry.time_in ||
            entry.time_out ||
            normalize(entry.status) === "present")
      );
    });

    const pendingPayrollAdjustments = payrollAdjustments.filter(
      (item) => normalize(item.status || "Pending") === "pending"
    );

    const unreleasedPayroll = payrollRecords.filter((record) =>
      ["for approval", "approved"].includes(normalize(record.status))
    );

    const negativePayroll = payrollRecords.filter(
      (record) =>
        Number(record.net_pay || record.net_amount || record.total_pay || 0) < 0
    );

    const pendingLeaveRequests = leaveRequests.filter((request) =>
      ["pending", "for approval"].includes(normalize(request.status || "Pending"))
    );

    const latestOccupancy =
      occupancyData.find(
        (row) => String(row.business_date).slice(0, 10) === todayKey
      ) || occupancyData[occupancyData.length - 1];

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

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="AUDIT / OPERATIONS AUDIT" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  AUDIT
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Operations Audit Center
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  One-page operational health check for finance, sales, workforce,
                  payroll, and operations risk.
                </p>
              </div>

              <button
                onClick={loadAuditData}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing..." : "Refresh Audit"}
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                  <ShieldCheck size={24} />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Overall Audit Score
                  </p>
                  <h2 className="mt-1 text-4xl font-black tracking-tight text-slate-950">
                    {audit.overallScore}
                  </h2>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Business Status
                </p>
                <p className="mt-1 text-xl font-black text-slate-950">
                  {audit.overallLevel}
                </p>
              </div>

              <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                Short rule: 95+ excellent, 85+ good, 70+ needs attention, below
                70 critical.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {audit.scoreCards.map((card) => (
                <ScoreCard key={card.title} card={card} />
              ))}
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MiniStat title="Active Employees" value={audit.activeEmployees} />
            <MiniStat
              title="Open Drawers"
              value={audit.openDrawers}
              danger={audit.openDrawers > 0}
            />
            <MiniStat
              title="Guest Balance"
              value={formatPeso(audit.unpaidGuestBalance)}
              danger={audit.unpaidGuestBalance > 0}
            />
            <MiniStat
              title="Pending Payroll"
              value={audit.pendingPayrollAdjustments}
              danger={audit.pendingPayrollAdjustments > 0}
            />
          </section>

          <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Risk Queue
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Needs Attention
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      Items that may affect daily closing, payroll, sales, or
                      operations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-6">
                {audit.issues.length > 0 ? (
                  audit.issues.map((issue, index) => (
                    <IssueCard
                      key={`${issue.area}-${issue.title}-${index}`}
                      issue={issue}
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                      <div>
                        <h3 className="font-black text-emerald-700">
                          No major issue detected.
                        </h3>
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          Current audit checks are clean.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Brain className="h-6 w-6 text-slate-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Owner View
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Audit Summary
                  </h2>
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

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xl font-black text-slate-950">
                  Immediate Actions
                </p>

                {audit.immediateActions.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {audit.immediateActions.map((issue, index) => (
                      <div
                        key={`${issue.title}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <p className="text-sm font-black text-slate-950">
                          {issue.action}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {issue.title}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    No urgent action. Continue monitoring daily closing and
                    payroll.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-blue-700">
                  <AlertTriangle size={16} />
                  Audit V1 note
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                  This page reads existing modules only. No new database table
                  needed.
                </p>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

function ScoreCard({ card }: { card: ScoreCardData }) {
  const level =
    card.score >= 95
      ? "Excellent"
      : card.score >= 85
        ? "Good"
        : card.score >= 70
          ? "Watch"
          : "Critical";

  const badgeClass =
    card.score >= 95
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : card.score >= 85
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : card.score >= 70
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {card.icon}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass}`}>
          {level}
        </span>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {card.title}
      </p>
      <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {card.score}
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{card.description}</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
        {card.issues.length} issue(s)
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  danger,
}: {
  title: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        danger ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
          danger ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {title}
      </p>
      <h3
        className={`mt-3 text-3xl font-black tracking-tight ${
          danger ? "text-amber-700" : "text-slate-950"
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const severityClass =
    issue.severity === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : issue.severity === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {issue.area}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${severityClass}`}>
              {issue.severity.toUpperCase()}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black text-slate-950">{issue.title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            {issue.details}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm lg:w-72">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Action
          </p>
          <p className="mt-1 font-black text-slate-950">{issue.action}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="font-black text-slate-950">{value}</p>
    </div>
  );
}