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
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { supabase } from "@/lib/supabase";

type AuditLevel = "Excellent" | "Good" | "Needs Attention" | "Critical";
type IssueSeverity = "low" | "medium" | "high";
type FinancialIssuePriority = "Action Required" | "Review Required" | "For Information";
type FinancialIssueType =
  | "Duplicate Posting"
  | "Missing Approved Posting"
  | "Orphan Cash Movement"
  | "Drawer Variance"
  | "Unlinked Source";

type AuditIssue = {
  area: string;
  title: string;
  details: string;
  severity: IssueSeverity;
  action: string;
};

type ScoreCardData = {
  title: string;
  score: number;
  icon: ReactNode;
  description: string;
  issues: AuditIssue[];
};

type FinancialAuditIssue = {
  id: string;
  priority: FinancialIssuePriority;
  type: FinancialIssueType;
  title: string;
  module: string;
  amount: number;
  date: string;
  reference: string;
  message: string;
  action: string;
  recordIds: string[];
  isLegacy?: boolean;
};

const LIVE_AUDIT_DAY_WINDOW = 30;

export default function AuditCenterPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [hotelReservations, setHotelReservations] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [financialPriorityFilter, setFinancialPriorityFilter] = useState("Action Required");
  const [financialTypeFilter, setFinancialTypeFilter] = useState("ALL");
  const [financialSearch, setFinancialSearch] = useState("");
  const [showLegacyWarnings, setShowLegacyWarnings] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);

  const formatPeso = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

  const getRowsFromTable = async (tableName: string) => {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error) {
      console.log(`AUDIT LOAD ${tableName} ERROR:`, error.message);
      return [];
    }

    return data || [];
  };

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
        "",
    ).slice(0, 10);

  const getDaysLeft = (dateValue: string | null) => {
    if (!dateValue) return null;

    const target = new Date(`${dateValue}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);

    if (Number.isNaN(target.getTime())) return null;

    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysAgo = (dateValue: string) => {
    if (!dateValue) return 99999;

    const target = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);

    if (Number.isNaN(target.getTime())) return 99999;

    return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isWithinLiveWindow = (dateValue: string) => {
    const daysAgo = getDaysAgo(dateValue);
    return daysAgo >= 0 && daysAgo <= LIVE_AUDIT_DAY_WINDOW;
  };

  const getDrawerVariance = (drawer: any) => {
    const saved = drawer.variance ?? drawer.cash_variance ?? drawer.difference;

    if (saved !== undefined && saved !== null) return Number(saved || 0);

    const actual = Number(drawer.actual_cash ?? drawer.actual_amount ?? 0);
    const expected = Number(drawer.expected_cash ?? drawer.expected_amount ?? 0);

    return actual - expected;
  };

  const getScoreFromDeductions = (deductions: number) => Math.max(0, Math.min(100, 100 - deductions));

  const getAuditLevel = (score: number): AuditLevel => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Good";
    if (score >= 70) return "Needs Attention";
    return "Critical";
  };

  const getMovementStatus = (movement: any) => normalize(movement.status || movement.movement_status || "ACTIVE");

  const isActiveMovement = (movement: any) =>
    getMovementStatus(movement) === "active" && !movement.voided_at && !movement.void_reason;

  const getApprovalPayload = (approval: any) => {
    if (!approval?.request_payload) return {};
    if (typeof approval.request_payload === "string") {
      try {
        return JSON.parse(approval.request_payload);
      } catch (error) {
        return {};
      }
    }
    return approval.request_payload || {};
  };

  const getApprovalAmount = (approval: any) => {
    const payload = getApprovalPayload(approval);
    return Number(payload.amount || payload.total_amount || approval.amount || 0);
  };

  const getMovementReferenceText = (movement: any) =>
    String(
      movement.reference_no ||
        movement.reference_id ||
        movement.origin_id ||
        movement.approval_request_id ||
        movement.remarks ||
        movement.id ||
        "",
    );

  const hasLinkedSource = (movement: any) =>
    Boolean(
      movement.approval_request_id ||
        movement.reference_id ||
        movement.origin_id ||
        movement.reservation_id ||
        movement.invoice_id ||
        movement.expense_id ||
        movement.pos_order_id,
    );

  const getIssueBadgeClass = (priority: FinancialIssuePriority) => {
    if (priority === "Action Required") return "border-red-200 bg-red-50 text-red-700";
    if (priority === "Review Required") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
  };

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
      cashMovementData,
      approvalData,
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
      getRowsFromTable("finance_cash_movements"),
      getRowsFromTable("approval_requests"),
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
    setCashMovements(cashMovementData);
    setApprovalRequests(approvalData);
    setHotelReservations(reservationData);
    setOccupancyData(occupancyRows);
    setLeaveRequests(leaveData);
    setLoading(false);
  };

  useEffect(() => {
    void loadAuditData();
  }, []);

  const audit = useMemo(() => {
    const activeEmployees = employees.filter((employee) => normalize(employee.employment_status || "Active") === "active");
    const payrollActiveEmployees = activeEmployees.filter((employee) => employee.payroll_active !== false);

    const openDrawers = cashDrawers.filter((drawer) =>
      ["open", "active", "pending"].includes(normalize(drawer.status || drawer.drawer_status)),
    );

    const drawerVarianceRows = cashDrawers.filter((drawer) => Math.abs(getDrawerVariance(drawer)) > 0);
    const totalDrawerVariance = drawerVarianceRows.reduce((sum, drawer) => sum + Math.abs(getDrawerVariance(drawer)), 0);

    const unpaidBills = bills.filter((bill) => {
      const status = normalize(bill.status);
      return status !== "paid" && status !== "cancelled";
    });

    const overdueBills = unpaidBills.filter((bill) => {
      const daysLeft = getDaysLeft(getDateValue(bill));
      return daysLeft !== null && daysLeft < 0;
    });

    const overdueBillsTotal = overdueBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

    const unpaidReservations = hotelReservations.filter((row) => Number(row.balance_due || 0) > 0);
    const unpaidGuestBalance = unpaidReservations.reduce((sum, row) => sum + Number(row.balance_due || 0), 0);

    const missingBookingSource = hotelReservations.filter(
      (row) => !row.booking_source || normalize(row.booking_source) === "needs review",
    );
    const missingRoomType = hotelReservations.filter((row) => !row.room_type || normalize(row.room_type) === "needs review");
    const negativeRevenue = hotelReservations.filter((row) => Number(row.amount_paid || row.grand_total || 0) < 0);

    const employeesWithoutDepartment = activeEmployees.filter((employee) => !employee.department);
    const employeesWithoutPosition = activeEmployees.filter((employee) => !employee.position);
    const employeesWithoutRate = payrollActiveEmployees.filter(
      (employee) => Number(employee.basic_rate || employee.daily_rate || 0) <= 0,
    );

    const todaySchedules = schedules.filter((row) => getDateValue(row) === todayKey);
    const todayAttendance = attendanceEntries.filter((row) => getDateValue(row) === todayKey);

    const missingTodayAttendance = todaySchedules.filter((schedule) => {
      const employeeId = schedule.employee_id || schedule.employee_no;
      const scheduleText = `${schedule.status || ""} ${schedule.shift || ""} ${schedule.shift_name || ""}`.toLowerCase();

      if (scheduleText.includes("off") || scheduleText.includes("rest") || scheduleText.includes("rd")) return false;

      return !todayAttendance.some(
        (entry) =>
          String(entry.employee_id || entry.employee_no) === String(employeeId) &&
          (entry.time_in || entry.time_out || normalize(entry.status) === "present"),
      );
    });

    const pendingPayrollAdjustments = payrollAdjustments.filter((item) => normalize(item.status || "Pending") === "pending");
    const unreleasedPayroll = payrollRecords.filter((record) => ["for approval", "approved"].includes(normalize(record.status)));
    const negativePayroll = payrollRecords.filter(
      (record) => Number(record.net_pay || record.net_amount || record.total_pay || 0) < 0,
    );
    const pendingLeaveRequests = leaveRequests.filter((request) =>
      ["pending", "for approval"].includes(normalize(request.status || "Pending")),
    );

    const latestOccupancy =
      occupancyData.find((row) => String(row.business_date).slice(0, 10) === todayKey) || occupancyData[occupancyData.length - 1];
    const occupancyToday = Number(latestOccupancy?.occupancy || 0);

    const issues: AuditIssue[] = [];
    const addIssue = (issue: AuditIssue, condition: boolean) => {
      if (condition) issues.push(issue);
    };

    addIssue(
      {
        area: "Finance",
        title: `${openDrawers.length} open cash drawer(s)`,
        details: "Cash drawer must be monitored before end-of-day reporting.",
        severity: "medium",
        action: "Verify active shift drawer before close.",
      },
      openDrawers.length > 0,
    );

    addIssue(
      {
        area: "Finance",
        title: `${formatPeso(totalDrawerVariance)} recorded cash variance`,
        details: "Closed drawers include variance records for review.",
        severity: totalDrawerVariance > 1000 ? "high" : "medium",
        action: "Review drawer report remarks and supporting FD report.",
      },
      totalDrawerVariance > 0,
    );

    addIssue(
      {
        area: "Finance",
        title: `${overdueBills.length} overdue bill(s)`,
        details: `${formatPeso(overdueBillsTotal)} total overdue amount.`,
        severity: "medium",
        action: "Prioritize overdue bills before new expenses.",
      },
      overdueBills.length > 0,
    );

    addIssue(
      {
        area: "Sales",
        title: `${unpaidReservations.length} unpaid reservation(s)`,
        details: `${formatPeso(unpaidGuestBalance)} guest balance needs checking.`,
        severity: unpaidGuestBalance > 50000 ? "high" : "medium",
        action: "Review unpaid rooms in Hotel Sales.",
      },
      unpaidReservations.length > 0,
    );

    addIssue(
      {
        area: "Sales",
        title: `${missingBookingSource.length} missing booking source`,
        details: "Some reservations need source tagging.",
        severity: "low",
        action: "Clean up booking source in Hotel Sales import.",
      },
      missingBookingSource.length > 0,
    );

    addIssue(
      {
        area: "Sales",
        title: `${missingRoomType.length} missing room type`,
        details: "Some reservations need room type review.",
        severity: "low",
        action: "Clean up room type in Hotel Sales import.",
      },
      missingRoomType.length > 0,
    );

    addIssue(
      {
        area: "Sales",
        title: `${negativeRevenue.length} negative revenue row(s)`,
        details: "Negative sales rows need verification.",
        severity: "medium",
        action: "Check imported Hotel Sales data.",
      },
      negativeRevenue.length > 0,
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutDepartment.length} employee(s) without department`,
        details: "Department is required for reporting and access filtering.",
        severity: "medium",
        action: "Update Employee 201 records.",
      },
      employeesWithoutDepartment.length > 0,
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutPosition.length} employee(s) without position`,
        details: "Position is needed for payroll and schedule reports.",
        severity: "low",
        action: "Update Employee 201 records.",
      },
      employeesWithoutPosition.length > 0,
    );

    addIssue(
      {
        area: "Workforce",
        title: `${employeesWithoutRate.length} payroll employee(s) without rate`,
        details: "Payroll active employees must have rate setup.",
        severity: "high",
        action: "Add basic rate in Employee 201.",
      },
      employeesWithoutRate.length > 0,
    );

    addIssue(
      {
        area: "Workforce",
        title: `${missingTodayAttendance.length} missing attendance today`,
        details: "Scheduled employees have no time entry yet.",
        severity: "medium",
        action: "Review Attendance Audit.",
      },
      missingTodayAttendance.length > 0,
    );

    addIssue(
      {
        area: "Payroll",
        title: `${pendingPayrollAdjustments.length} pending payroll adjustment(s)`,
        details: "Pending deductions or earnings can affect payroll accuracy.",
        severity: "high",
        action: "Approve or reject adjustments in Payroll Register.",
      },
      pendingPayrollAdjustments.length > 0,
    );

    addIssue(
      {
        area: "Payroll",
        title: `${unreleasedPayroll.length} payroll record(s) ready for release`,
        details: "Approved payroll records have not been released yet.",
        severity: "medium",
        action: "Review Payroll Manager.",
      },
      unreleasedPayroll.length > 0,
    );

    addIssue(
      {
        area: "Payroll",
        title: `${negativePayroll.length} negative payroll record(s)`,
        details: "Net pay is below zero due to deductions or carry-forward.",
        severity: "medium",
        action: "Review deductions before release.",
      },
      negativePayroll.length > 0,
    );

    addIssue(
      {
        area: "Operations",
        title: `${pendingLeaveRequests.length} pending leave request(s)`,
        details: "Pending leave may affect schedule coverage.",
        severity: "medium",
        action: "Approve or reject leave requests.",
      },
      pendingLeaveRequests.length > 0,
    );

    addIssue(
      {
        area: "Operations",
        title: `Low occupancy at ${occupancyToday}%`,
        details: "Occupancy is below target.",
        severity: "medium",
        action: "Review sales channels and direct booking actions.",
      },
      occupancyToday > 0 && occupancyToday < 40,
    );

    const liveMovements = cashMovements.filter((movement) => isWithinLiveWindow(getDateValue(movement)));
    const activeCashMovements = liveMovements.filter(isActiveMovement);
    const activeDrawerMovements = activeCashMovements.filter((movement) =>
      ["cash in", "cash out", "remittance", "turnover", "opening float"].includes(normalize(movement.movement_type)),
    );

    const financialIssues: FinancialAuditIssue[] = [];
    const addFinancialIssue = (issue: FinancialAuditIssue) => financialIssues.push(issue);

    const duplicateMap = new Map<string, any[]>();

    activeDrawerMovements.forEach((movement) => {
      const movementType = normalize(movement.movement_type);
      if (!["cash in", "cash out"].includes(movementType)) return;

      const key = [
        getDateValue(movement),
        normalize(movement.source),
        normalize(movement.payment_type || "Cash"),
        Number(movement.amount || 0).toFixed(2),
        String(movement.cash_cash_drawer_id || "NO_DRAWER"),
      ].join("|");

      duplicateMap.set(key, [...(duplicateMap.get(key) || []), movement]);
    });

    Array.from(duplicateMap.values()).forEach((rows) => {
      if (rows.length <= 1) return;
      const first = rows[0];

      addFinancialIssue({
        id: `duplicate-${getDateValue(first)}-${first.source}-${first.payment_type}-${first.amount}-${first.cash_cash_drawer_id}`,
        priority: "Action Required",
        type: "Duplicate Posting",
        title: `${String(first.source || "Cash Movement")} may be duplicated`,
        module: "Cash Management",
        amount: Number(first.amount || 0),
        date: getDateValue(first),
        reference: `${String(first.source || "Movement")} / ${String(first.payment_type || "Cash")}`,
        message: `${rows.length} active postings share the same date, source, payment, amount, and drawer.`,
        action: "Review duplicate movements before daily close.",
        recordIds: rows.map((row) => String(row.id || "")).filter(Boolean),
      });
    });

    const cashApprovalTypes = ["EXPENSE_RELEASE", "CASH_ADVANCE_RELEASE", "OWNER_WITHDRAWAL", "BANK_DEPOSIT", "REFUND_OUT", "ADJUSTMENT_OUT"];
    const liveApprovedCashApprovals = approvalRequests.filter((approval) => {
      const requestType = String(approval.request_type || "").trim().toUpperCase();
      return (
        cashApprovalTypes.includes(requestType) &&
        normalize(approval.status) === "approved" &&
        isWithinLiveWindow(getDateValue(approval))
      );
    });

    liveApprovedCashApprovals.forEach((approval) => {
      const payload = getApprovalPayload(approval);
      const approvalId = String(approval.id || "");
      const amount = getApprovalAmount(approval);

      const linkedMovement = activeCashMovements.find((movement) => {
        const movementAmount = Number(movement.amount || 0);
        const sameApproval =
          String(movement.approval_request_id || "") === approvalId ||
          String(movement.reference_id || "") === approvalId ||
          String(movement.origin_id || "") === approvalId ||
          String(movement.remarks || "").includes(approvalId);

        if (sameApproval) return true;

        const sameAmount = amount > 0 && Math.abs(movementAmount - amount) < 0.009;
        const sameSource =
          normalize(movement.source).includes("expense") ||
          normalize(movement.source).includes("advance") ||
          normalize(movement.reference_type).includes("approval");

        return sameAmount && sameSource && getDateValue(movement) === getDateValue(approval);
      });

      if (linkedMovement) return;

      addFinancialIssue({
        id: `missing-approval-${approvalId}`,
        priority: "Action Required",
        type: "Missing Approved Posting",
        title: `${String(approval.title || approval.request_type || "Approved cash request")} has no cash movement`,
        module: "Approval Center",
        amount,
        date: getDateValue(approval),
        reference: String(approval.title || approval.request_type || approvalId),
        message: "Approved cash request found, but no linked active cash movement was detected.",
        action: "Verify if this approved request should create a cash movement.",
        recordIds: [approvalId],
        isLegacy: !payload?.cash_cash_drawer_id && !payload?.business_date,
      });
    });

    activeDrawerMovements.forEach((movement) => {
      const movementType = normalize(movement.movement_type);
      if (!["cash in", "cash out"].includes(movementType)) return;

      const isOwnerAbono = normalize(movement.payment_type).includes("owner");
      const isLegacy = !isWithinLiveWindow(getDateValue(movement));

      if (!movement.cash_cash_drawer_id && !isOwnerAbono) {
        addFinancialIssue({
          id: `orphan-${movement.id || getMovementReferenceText(movement)}`,
          priority: "Review Required",
          type: "Orphan Cash Movement",
          title: `${String(movement.source || "Cash movement")} is not linked to a drawer`,
          module: "Cash Management",
          amount: Number(movement.amount || 0),
          date: getDateValue(movement),
          reference: getMovementReferenceText(movement),
          message: "Cash in/out record has no cash drawer ID. This can affect drawer reports.",
          action: "Confirm whether this is historical import or should be linked to a drawer.",
          recordIds: [String(movement.id || "")].filter(Boolean),
          isLegacy,
        });
      }

      if (!hasLinkedSource(movement) && !String(movement.remarks || "").trim()) {
        addFinancialIssue({
          id: `unlinked-${movement.id || getMovementReferenceText(movement)}`,
          priority: "For Information",
          type: "Unlinked Source",
          title: `${String(movement.source || "Cash movement")} has no source reference`,
          module: "Cash Management",
          amount: Number(movement.amount || 0),
          date: getDateValue(movement),
          reference: getMovementReferenceText(movement),
          message: "No approval, origin, reference, or remarks detected. Usually historical/legacy records.",
          action: "No urgent action unless this belongs to today's drawer.",
          recordIds: [String(movement.id || "")].filter(Boolean),
          isLegacy: true,
        });
      }
    });

    cashDrawers
      .filter((drawer) => isWithinLiveWindow(getDateValue(drawer)))
      .forEach((drawer) => {
        const variance = getDrawerVariance(drawer);
        if (Math.abs(variance) <= 0.009) return;

        addFinancialIssue({
          id: `drawer-variance-${drawer.id || drawer.holder_name}`,
          priority: Math.abs(variance) > 1000 ? "Action Required" : "Review Required",
          type: "Drawer Variance",
          title: `${String(drawer.holder_name || "Drawer")} has recorded variance`,
          module: "Cash Drawer",
          amount: Math.abs(variance),
          date: getDateValue(drawer),
          reference: String(drawer.holder_name || drawer.id || "Cash Drawer"),
          message: `${String(drawer.holder_name || "Drawer")} closed with ${formatPeso(variance)} variance.`,
          action: "Review drawer report remarks and supporting manual report.",
          recordIds: [String(drawer.id || "")].filter(Boolean),
        });
      });

    const actionRequired = financialIssues.filter((item) => item.priority === "Action Required");
    const reviewRequired = financialIssues.filter((item) => item.priority === "Review Required");
    const informational = financialIssues.filter((item) => item.priority === "For Information");

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
        }, 0),
      );

    const financeScore = scoreByIssues(financeIssues) - Math.min(40, actionRequired.length * 10 + reviewRequired.length * 4);
    const salesScore = scoreByIssues(salesIssues);
    const workforceScore = scoreByIssues(workforceIssues);
    const payrollScore = scoreByIssues(payrollIssues);
    const operationsScore = scoreByIssues(operationsIssues);

    const scoreCards: ScoreCardData[] = [
      {
        title: "Finance",
        score: Math.max(0, financeScore),
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

    const overallScore = Math.round(
      Math.max(0, financeScore) * 0.25 +
        salesScore * 0.2 +
        workforceScore * 0.2 +
        payrollScore * 0.2 +
        operationsScore * 0.15,
    );

    const highRiskAreas = scoreCards.filter((card) => card.score < 85).sort((a, b) => a.score - b.score);
    const immediateActions = issues.filter((issue) => issue.severity === "high").slice(0, 5);

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
      financialIssues,
      actionRequired,
      reviewRequired,
      informational,
    };
  }, [
    employees,
    schedules,
    attendanceEntries,
    payrollRecords,
    payrollAdjustments,
    bills,
    cashDrawers,
    cashMovements,
    approvalRequests,
    hotelReservations,
    occupancyData,
    leaveRequests,
  ]);

  const filteredFinancialIssues = useMemo(() => {
    const search = normalize(financialSearch);

    return audit.financialIssues.filter((item) => {
      if (!showLegacyWarnings && item.isLegacy) return false;
      if (financialPriorityFilter !== "ALL" && item.priority !== financialPriorityFilter) return false;
      if (financialTypeFilter !== "ALL" && item.type !== financialTypeFilter) return false;

      const matchesSearch =
        !search ||
        normalize(item.title).includes(search) ||
        normalize(item.reference).includes(search) ||
        normalize(item.message).includes(search) ||
        normalize(item.action).includes(search) ||
        item.recordIds.some((id) => normalize(id).includes(search));

      return matchesSearch;
    });
  }, [audit.financialIssues, financialPriorityFilter, financialTypeFilter, financialSearch, showLegacyWarnings]);

  const visibleActionRequired = audit.actionRequired.filter((item) => showLegacyWarnings || !item.isLegacy).length;
  const visibleReviewRequired = audit.reviewRequired.filter((item) => showLegacyWarnings || !item.isLegacy).length;
  const visibleInformational = audit.informational.filter((item) => showLegacyWarnings || !item.isLegacy).length;

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="AUDIT / OPERATIONS AUDIT" />

        <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">AUDIT</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Operations Audit Center</h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Live operations control center for finance, sales, workforce, payroll, and production posting integrity.
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overall Audit Score</p>
                  <h2 className="mt-1 text-4xl font-black tracking-tight text-slate-950">{audit.overallScore}</h2>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Business Status</p>
                <p className="mt-1 text-xl font-black text-slate-950">{audit.overallLevel}</p>
              </div>

              <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                Production mode: read-only checks first. No audit result changes live records from this screen.
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
            <MiniStat title="Open Drawers" value={audit.openDrawers} danger={audit.openDrawers > 0} />
            <MiniStat title="Guest Balance" value={formatPeso(audit.unpaidGuestBalance)} danger={audit.unpaidGuestBalance > 0} />
            <MiniStat title="Pending Payroll" value={audit.pendingPayrollAdjustments} danger={audit.pendingPayrollAdjustments > 0} />
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-1 h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Financial Integrity</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Revenue Posting Audit</h2>
                    <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                      Manager-friendly view of production posting problems. Focus is on what needs action now, not legacy noise.
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                  Last {LIVE_AUDIT_DAY_WINDOW} days
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-6 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setFinancialPriorityFilter("Action Required")}
                className={`rounded-3xl border p-5 text-left transition-all duration-200 hover:shadow-md ${
                  financialPriorityFilter === "Action Required" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-700">Action Required</p>
                <h3 className="mt-3 text-4xl font-black text-red-700">{visibleActionRequired}</h3>
                <p className="mt-1 text-sm font-bold text-red-700">Fix or verify before daily close.</p>
              </button>

              <button
                type="button"
                onClick={() => setFinancialPriorityFilter("Review Required")}
                className={`rounded-3xl border p-5 text-left transition-all duration-200 hover:shadow-md ${
                  financialPriorityFilter === "Review Required" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Review Required</p>
                <h3 className="mt-3 text-4xl font-black text-amber-700">{visibleReviewRequired}</h3>
                <p className="mt-1 text-sm font-bold text-amber-700">Needs manager validation.</p>
              </button>

              <button
                type="button"
                onClick={() => setFinancialPriorityFilter("For Information")}
                className={`rounded-3xl border p-5 text-left transition-all duration-200 hover:shadow-md ${
                  financialPriorityFilter === "For Information" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">For Information</p>
                <h3 className="mt-3 text-4xl font-black text-blue-700">{visibleInformational}</h3>
                <p className="mt-1 text-sm font-bold text-blue-700">Usually historical or low-risk items.</p>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-6 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={financialSearch}
                  onChange={(event) => setFinancialSearch(event.target.value)}
                  placeholder="Search issue, amount, reference, remarks..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <select
                value={financialPriorityFilter}
                onChange={(event) => setFinancialPriorityFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="Action Required">Action Required</option>
                <option value="Review Required">Review Required</option>
                <option value="For Information">For Information</option>
              </select>

              <select
                value={financialTypeFilter}
                onChange={(event) => setFinancialTypeFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Issue Types</option>
                <option value="Duplicate Posting">Duplicate Posting</option>
                <option value="Missing Approved Posting">Missing Posting</option>
                <option value="Orphan Cash Movement">Orphan Record</option>
                <option value="Drawer Variance">Drawer Variance</option>
                <option value="Unlinked Source">Unlinked Source</option>
              </select>

              <label className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                <input
                  type="checkbox"
                  checked={showLegacyWarnings}
                  onChange={(event) => setShowLegacyWarnings(event.target.checked)}
                  className="h-4 w-4"
                />
                Legacy
              </label>
            </div>

            <div className="p-6">
              {filteredFinancialIssues.length > 0 ? (
                <div className="space-y-3">
                  {filteredFinancialIssues.map((issue) => (
                    <FinancialIssueCard key={issue.id} issue={issue} formatPeso={formatPeso} badgeClass={getIssueBadgeClass(issue.priority)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                    <div>
                      <h3 className="font-black text-emerald-700">No issue in the selected filter.</h3>
                      <p className="mt-1 text-sm font-bold text-emerald-700">
                        Change filters or enable legacy warnings if you need historical review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Risk Queue</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Needs Attention</h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      General operational items that may affect daily closing, payroll, sales, or coverage.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-6">
                {audit.issues.length > 0 ? (
                  audit.issues.map((issue, index) => <IssueCard key={`${issue.area}-${issue.title}-${index}`} issue={issue} />)
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                      <div>
                        <h3 className="font-black text-emerald-700">No major issue detected.</h3>
                        <p className="mt-1 text-sm font-bold text-emerald-700">Current audit checks are clean.</p>
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Owner View</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Audit Summary</h2>
                </div>
              </div>

              <div className="space-y-3">
                <SummaryRow label="Overall Score" value={`${audit.overallScore}/100`} />
                <SummaryRow label="Status" value={audit.overallLevel} />
                <SummaryRow label="Highest Risk" value={audit.highRiskAreas[0]?.title || "None"} />
                <SummaryRow label="Financial Action Items" value={visibleActionRequired} />
                <SummaryRow label="Total Issues" value={audit.issues.length + visibleActionRequired + visibleReviewRequired} />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xl font-black text-slate-950">Immediate Actions</p>

                {audit.actionRequired.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {audit.actionRequired.slice(0, 4).map((issue) => (
                      <div key={issue.id} className="rounded-2xl border border-red-200 bg-white px-4 py-3">
                        <p className="text-sm font-black text-red-700">{issue.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{issue.action}</p>
                      </div>
                    ))}
                  </div>
                ) : audit.immediateActions.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {audit.immediateActions.map((issue, index) => (
                      <div key={`${issue.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{issue.action}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{issue.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-500">No urgent action. Continue monitoring daily close and payroll.</p>
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-blue-700">
                  <AlertTriangle size={16} />
                  Production audit note
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                  This audit page is read-only. Use source modules to correct records after verification.
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
  const safeScore = Math.max(0, Math.min(100, card.score));
  const level = safeScore >= 95 ? "Excellent" : safeScore >= 85 ? "Good" : safeScore >= 70 ? "Watch" : "Critical";

  const badgeClass =
    safeScore >= 95
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : safeScore >= 85
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : safeScore >= 70
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">{card.icon}</div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass}`}>{level}</span>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
      <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{safeScore}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{card.description}</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
        {card.issues.length} issue(s)
      </div>
    </div>
  );
}

function MiniStat({ title, value, danger }: { title: string; value: any; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${danger ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${danger ? "text-amber-700" : "text-slate-500"}`}>{title}</p>
      <h3 className={`mt-3 text-3xl font-black tracking-tight ${danger ? "text-amber-700" : "text-slate-950"}`}>{value}</h3>
    </div>
  );
}

function FinancialIssueCard({
  issue,
  formatPeso,
  badgeClass,
}: {
  issue: FinancialAuditIssue;
  formatPeso: (value: any) => string;
  badgeClass: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${badgeClass}`}>{issue.priority}</span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{issue.type}</span>
            {issue.isLegacy && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Legacy</span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-black text-slate-950">{issue.title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{issue.message}</p>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <SmallInfo label="Date" value={issue.date || "No date"} />
            <SmallInfo label="Amount" value={formatPeso(issue.amount)} />
            <SmallInfo label="Reference" value={issue.reference || "No reference"} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm xl:w-80">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Recommended Action</p>
          <p className="mt-1 font-black leading-6 text-slate-950">{issue.action}</p>
        </div>
      </div>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950" title={String(value || "")}>{value}</p>
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
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{issue.area}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${severityClass}`}>{issue.severity.toUpperCase()}</span>
          </div>

          <h3 className="mt-3 text-lg font-black text-slate-950">{issue.title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{issue.details}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm lg:w-72">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Action</p>
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


