import { supabase } from '@/lib/supabase';
"use client";


"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Menu,
  PhilippinePeso,
  ShieldCheck,
  UserCircle,
  WalletCards,
  X,
} from "lucide-react";
import { createAuditLog } from "@/lib/audit";
import { executeCashDrawerApprovalAction } from "@/lib/approvals/approval-actions";

const CASH_DRAWER_REQUEST_TYPES = [
  "EXPENSE_RELEASE",
  "CASH_DRAWER_OUT",
  "CASH_EXPENSE_RELEASE",
  "CASH_ADVANCE_RELEASE",
  "OWNER_WITHDRAWAL",
  "BANK_DEPOSIT",
  "REFUND_OUT",
  "ADJUSTMENT_OUT",
];


type PortalSchedule = {
  day: string;
  shift: string;
  scheduled_in: string | null;
  scheduled_out: string | null;
};

type AttendanceEntry = {
  id?: string;
  employee_id: string;
  attendance_date: string;
  scheduled_shift?: string | null;
  scheduled_in?: string | null;
  scheduled_out?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  late_minutes?: number;
  undertime_minutes?: number;
  ot_minutes?: number;
  status?: string;
  remarks?: string | null;
  time_in_latitude?: number | null;
  time_in_longitude?: number | null;
  time_out_latitude?: number | null;
  time_out_longitude?: number | null;
  time_in_accuracy?: number | null;
  time_out_accuracy?: number | null;
  time_in_location_status?: string | null;
  time_out_location_status?: string | null;
};

type PortalLocationCapture = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: "GPS_CAPTURED" | "GPS_UNAVAILABLE" | "PERMISSION_DENIED" | "GPS_TIMEOUT" | "GPS_ERROR";
};

type LeaveRequest = {
  id?: string | number;
  company_id?: string | null;
  employee_id: string;
  employee_name?: string | null;
  employee_no?: string | null;
  department?: string | null;
  position?: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  total_days?: number | null;
  reason: string;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  requested_by?: string | null;
  requested_at?: string | null;
  created_at?: string | null;
};

type LeaveCredit = {
  id?: string | number;
  employee_id?: string | null;
  employee_no?: string | null;
  employee_name?: string | null;
  leave_type?: string | null;
  earned_credits?: number | null;
  total_credits?: number | null;
  used_credits?: number | null;
  remaining_credits?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type ApprovalRequest = {
  id?: string | number;
  company_id?: string | null;
  request_type?: string | null;
  module?: string | null;
  reference_id?: string | number | null;
  title?: string | null;
  description?: string | null;
  requested_by?: string | null;
  status?: string | null;
  request_payload?: any;
  approved_by?: string | null;
  rejected_by?: string | null;
  created_at?: string | null;
};

type Announcement = {
  id?: string | number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  priority?: string | null;
  audience?: string | null;
  posted_by?: string | null;
  created_by?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type EmployeeBalance = {
  id?: string;
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
};

type PayslipRow = {
  id?: string;
  payroll_period_id?: string | null;
  employee_id?: string | null;
  employee_no?: string | null;
  employee_name?: string | null;
  department?: string | null;
  position?: string | null;
  period?: string | null;
  period_name?: string | null;
  payroll_period?: string | null;
  cutoff_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  basic_pay?: number | null;
  ot_pay?: number | null;
  late_deduction?: number | null;
  undertime_deduction?: number | null;
  absence_deduction?: number | null;
  allowances?: number | null;
  incentives?: number | null;
  cash_advance?: number | null;
  other_deductions?: number | null;
  gross_pay?: number | null;
  total_earnings?: number | null;
  total_deductions?: number | null;
  deductions?: number | null;
  net_pay?: number | null;
  final_pay?: number | null;
  release_amount?: number | null;
  snapshot_type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type PortalTab =
  | "home"
  | "schedule"
  | "attendance"
  | "performance"
  | "leave"
  | "payslip"
  | "cashadvance"
  | "announcements"
  | "approvals"
  | "manager"
  | "profile";

export default function EmployeePortalPage() {
  /// STATES
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<PortalSchedule[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [leaveCredits, setLeaveCredits] = useState<LeaveCredit[]>([]);
  const [pendingCancellationRequests, setPendingCancellationRequests] = useState<ApprovalRequest[]>([]);
  const [managerApprovals, setManagerApprovals] = useState<ApprovalRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isAssignedApprover, setIsAssignedApprover] = useState(false);
  const [approverAssignments, setApproverAssignments] = useState<any[]>([]);
  const [cancelLeaveModal, setCancelLeaveModal] = useState<LeaveRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedApprovalModal, setSelectedApprovalModal] = useState<ApprovalRequest | null>(null);
  const [rejectApprovalModal, setRejectApprovalModal] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("Normal");
  const [leaveView, setLeaveView] = useState<"request" | "history">("request");
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<EmployeeBalance[]>([]);
  const [activePayslip, setActivePayslip] = useState<PayslipRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>("home");

  const [leaveType, setLeaveType] = useState("Vacation Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  /// DATA
  const getPhilippinesDate = () => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  };

  const getPhilippinesTime = () => {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const today = getPhilippinesDate();

  const fallbackShifts: any = {
    "AM Shift": {
      scheduled_shift: "AM Shift",
      scheduled_in: "07:00",
      scheduled_out: "16:00",
    },
    "PM Shift": {
      scheduled_shift: "PM Shift",
      scheduled_in: "14:00",
      scheduled_out: "23:00",
    },
    "Mid Shift": {
      scheduled_shift: "Mid Shift",
      scheduled_in: "11:00",
      scheduled_out: "20:00",
    },
    "GY Shift": {
      scheduled_shift: "GY Shift",
      scheduled_in: "23:00",
      scheduled_out: "08:00",
    },
  };

  const menuItems: { key: PortalTab; label: string; icon: any }[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "schedule", label: "My Schedule", icon: CalendarDays },
    { key: "attendance", label: "Attendance", icon: CheckCircle2 },
    { key: "performance", label: "Performance", icon: ShieldCheck },
    { key: "leave", label: "Leave", icon: FileText },
    { key: "payslip", label: "Payslips", icon: PhilippinePeso },
    { key: "cashadvance", label: "Cash Advances", icon: WalletCards },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "approvals", label: "Approvals", icon: ShieldCheck },
    { key: "profile", label: "Profile", icon: UserCircle },
  ];

  /// CALCULATIONS
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  };

  const leaveDays = calculateDays();

  const employeeName = currentUser
    ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
    : "No employee loaded";

  const employeeDepartment =
    currentUser?.department || currentUser?.position || "Employee Portal";

  const employeeNumber =
    currentUser?.employee_no ||
    currentUser?.employee_number ||
    currentUser?.id ||
    "-";

  const canUseManagerTools = isAssignedApprover;

  const canPostAnnouncements =
    canUseManagerTools ||
    rolePermissions.some((permission) => {
      const moduleKey = String(
        permission.module_key ||
          permission.module ||
          permission.page_key ||
          permission.permission_key ||
          ""
      ).toLowerCase();

      const actionKey = String(
        permission.action ||
          permission.permission ||
          permission.access_level ||
          ""
      ).toLowerCase();

      const allowedValue = permission.allowed ?? permission.can_access ?? permission.is_allowed ?? true;

      return (
        allowedValue !== false &&
        (
          moduleKey.includes("announcement") ||
          moduleKey.includes("manager") ||
          moduleKey.includes("owner") ||
          actionKey.includes("announcement")
        )
      );
    });

  const portalMenuItems = menuItems.filter(
    (item) => item.key !== "approvals" || canUseManagerTools
  );

  const getMinutes = (time: string | null) => {
    if (!time) return 0;

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const getCurrentTime = () => {
    return getPhilippinesTime();
  };

  const formatTime = (time?: string | null) => {
    if (!time) return "-";

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return cleanTime;

    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;

    return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "-";

    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  };

  const formatWeekday = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-PH", {
      weekday: "short",
    });
  };

  const formatMoney = (value: any) => {
    const amount = Number(value || 0);

    return amount.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    });
  };

  const getPayslipPeriodLabel = (payslip: PayslipRow) => {
    return (
      payslip.period ||
      payslip.period_name ||
      payslip.payroll_period ||
      payslip.cutoff_name ||
      `${formatDate(payslip.start_date)} - ${formatDate(payslip.end_date)}`
    );
  };

  const getPayslipGross = (payslip: PayslipRow) => {
    return Number(
      payslip.gross_pay ??
        payslip.total_earnings ??
        Number(payslip.basic_pay || 0) +
          Number(payslip.ot_pay || 0) +
          Number(payslip.allowances || 0) +
          Number(payslip.incentives || 0)
    );
  };

  const getPayslipDeductions = (payslip: PayslipRow) => {
    return Number(
      payslip.total_deductions ??
        payslip.deductions ??
        Number(payslip.late_deduction || 0) +
          Number(payslip.undertime_deduction || 0) +
          Number(payslip.absence_deduction || 0) +
          Number(payslip.cash_advance || 0) +
          Number(payslip.other_deductions || 0)
    );
  };

  const getPayslipNet = (payslip: PayslipRow) => {
    return Number(
      payslip.net_pay ??
        payslip.final_pay ??
        payslip.release_amount ??
        getPayslipGross(payslip) - getPayslipDeductions(payslip)
    );
  };

  const downloadPayslipPDF = (payslip: PayslipRow) => {
    const period = getPayslipPeriodLabel(payslip);
    const gross = getPayslipGross(payslip);
    const deductions = getPayslipDeductions(payslip);
    const net = getPayslipNet(payslip);
    const issuedDate = payslip.created_at
      ? new Date(payslip.created_at).toLocaleString("en-PH")
      : new Date().toLocaleString("en-PH");

    const safeFileName = `${employeeName || "Employee"}-${period || "Payslip"}`
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${safeFileName}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .page {
              max-width: 760px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 18px;
              padding: 28px;
            }
            .brand {
              letter-spacing: 0.3em;
              color: #b45309;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
            }
            h1 {
              margin: 8px 0 4px;
              font-size: 30px;
            }
            .muted { color: #64748b; font-size: 13px; }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-top: 22px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 14px;
              background: #f8fafc;
            }
            .label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-weight: 700;
            }
            .value {
              margin-top: 6px;
              font-size: 18px;
              font-weight: 800;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              font-size: 14px;
            }
            th, td {
              border-bottom: 1px solid #e2e8f0;
              padding: 12px 8px;
              text-align: left;
            }
            th { color: #475569; font-size: 12px; text-transform: uppercase; }
            .right { text-align: right; }
            .net {
              color: #047857;
              font-weight: 900;
              font-size: 20px;
            }
            .footer {
              margin-top: 28px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { padding: 0; }
              .page { border: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="brand">OPSCORE</div>
            <h1>Payslip</h1>
            <div class="muted">Generated from OPSCORE Employee Portal</div>

            <div class="grid">
              <div class="card">
                <div class="label">Employee</div>
                <div class="value">${employeeName}</div>
                <div class="muted">${employeeDepartment} â€¢ Employee #${employeeNumber}</div>
              </div>
              <div class="card">
                <div class="label">Payroll Period</div>
                <div class="value">${period}</div>
                <div class="muted">Issued: ${issuedDate}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Pay</td>
                  <td class="right">${formatMoney(payslip.basic_pay || 0)}</td>
                </tr>
                <tr>
                  <td>OT Pay</td>
                  <td class="right">${formatMoney(payslip.ot_pay || 0)}</td>
                </tr>
                <tr>
                  <td>Allowances / Incentives</td>
                  <td class="right">${formatMoney(Number(payslip.allowances || 0) + Number(payslip.incentives || 0))}</td>
                </tr>
                <tr>
                  <td>Gross Pay</td>
                  <td class="right">${formatMoney(gross)}</td>
                </tr>
                <tr>
                  <td>Total Deductions</td>
                  <td class="right">${formatMoney(deductions)}</td>
                </tr>
                <tr>
                  <td><strong>Net Pay / Release Amount</strong></td>
                  <td class="right net">${formatMoney(net)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              This payslip is system-generated. For questions or corrections, please contact Admin or Payroll.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to download or print your payslip.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formatLocalDateValue = (date: Date) => {
    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  };

  const getWeekDates = () => {
    const current = new Date(`${today}T00:00:00+08:00`);
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return formatLocalDateValue(date);
    });
  };

  const getLast30DaysStart = () => {
    const date = new Date(`${today}T00:00:00+08:00`);
    date.setDate(date.getDate() - 30);
    return formatLocalDateValue(date);
  };

  const computeLateMinutes = (scheduledIn: string | null, timeIn: string) => {
    if (!scheduledIn) return 0;
    return Math.max(0, getMinutes(timeIn) - getMinutes(scheduledIn));
  };

  const computeUndertimeMinutes = (
    scheduledOut: string | null,
    timeOut: string
  ) => {
    if (!scheduledOut) return 0;
    return Math.max(0, getMinutes(scheduledOut) - getMinutes(timeOut));
  };

  const computeOTMinutes = (scheduledOut: string | null, timeOut: string) => {
    if (!scheduledOut) return 0;
    return Math.max(0, getMinutes(timeOut) - getMinutes(scheduledOut));
  };

  const attendanceScore = useMemo(() => {
    if (attendanceHistory.length === 0) return 100;

    const lateCount = attendanceHistory.filter(
      (entry) => Number(entry.late_minutes || 0) > 0
    ).length;

    const undertimeCount = attendanceHistory.filter(
      (entry) => Number(entry.undertime_minutes || 0) > 0
    ).length;

    const absentCount = attendanceHistory.filter(
      (entry) => String(entry.status || "").toLowerCase() === "absent"
    ).length;

    const missingCount = attendanceHistory.filter(
      (entry) => entry.time_in && !entry.time_out
    ).length;

    const score =
      100 - lateCount * 2 - undertimeCount * 3 - absentCount * 8 - missingCount * 5;

    return Math.max(0, score);
  }, [attendanceHistory]);

  const attendanceScoreLabel =
    attendanceScore >= 95
      ? "Excellent"
      : attendanceScore >= 85
      ? "Good"
      : attendanceScore >= 75
      ? "Needs Coaching"
      : "Critical";

  const presentCount = attendanceHistory.filter((entry) => {
    const status = String(entry.status || "").toLowerCase();
    return ["present", "completed", "late", "undertime", "overtime"].includes(
      status
    );
  }).length;

  const lateCount = attendanceHistory.filter(
    (entry) => Number(entry.late_minutes || 0) > 0
  ).length;

  const undertimeCount = attendanceHistory.filter(
    (entry) => Number(entry.undertime_minutes || 0) > 0
  ).length;

  const absentCount = attendanceHistory.filter(
    (entry) => String(entry.status || "").toLowerCase() === "absent"
  ).length;

  const leaveStatuses = leaveHistory.reduce(
    (summary, leave) => {
      const status = String(leave.status || "Pending").toLowerCase();

      if (status === "pending") summary.pending += 1;
      if (status === "approved") summary.approved += 1;
      if (status === "rejected") summary.rejected += 1;
      if (status === "cancelled") summary.cancelled += 1;

      return summary;
    },
    { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  );

  const pendingCancellationLeaveIds = pendingCancellationRequests
    .filter((request) => String(request.status || "").toUpperCase() === "PENDING")
    .map((request) => String(request.reference_id || request.request_payload?.leave_id || ""));

  const isLeaveCancellationPending = (leaveId: any) => {
    return pendingCancellationLeaveIds.includes(String(leaveId));
  };

  const canCancelLeave = (leave: LeaveRequest) => {
    return (
      String(leave.status || "").toLowerCase() === "approved" &&
      !!leave.id &&
      !isLeaveCancellationPending(leave.id)
    );
  };

  const totalRemainingLeaveCredits = leaveCredits.reduce(
    (sum, credit) => sum + Number(credit.remaining_credits || 0),
    0
  );

  const totalUsedLeaveCredits = leaveCredits.reduce(
    (sum, credit) => sum + Number(credit.used_credits || 0),
    0
  );

  const activeEmployeeBalances = employeeBalances.filter(
    (item) => String(item.status || "Active").toLowerCase() === "active"
  );

  const cashAdvanceBalances = employeeBalances.filter((item) => {
    const type = String(item.balance_type || "").toLowerCase();
    const source = String(item.source_module || "").toLowerCase();
    return type.includes("cash") || type.includes("advance") || source.includes("cash");
  });

  const payrollSalaryBalances = employeeBalances.filter((item) => {
    const type = String(item.balance_type || "").toLowerCase();
    return type.includes("payroll balance") || type.includes("salary");
  });

  const totalActiveBalance = activeEmployeeBalances.reduce(
    (sum, item) => sum + Number(item.remaining_balance || 0),
    0
  );

  const totalCashAdvanceRemaining = cashAdvanceBalances
    .filter((item) => String(item.status || "Active").toLowerCase() === "active")
    .reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0);

  const latestPayslip = payslips[0] || null;

  const portalNotifications = [
    ...(latestPayslip
      ? [`Latest payslip available: ${getPayslipPeriodLabel(latestPayslip)}.`]
      : []),
    ...(totalCashAdvanceRemaining > 0
      ? [`Active cash advance balance: ${formatMoney(totalCashAdvanceRemaining)}.`]
      : []),
    ...(schedule?.scheduled_shift
      ? [`Today schedule: ${schedule.scheduled_shift} ${formatTime(schedule.scheduled_in)} - ${formatTime(schedule.scheduled_out)}.`]
      : []),
    ...(leaveHistory.some((leave) => String(leave.status || "").toLowerCase() === "pending")
      ? ["You have pending leave request(s)."]
      : []),
    ...(pendingCancellationRequests.length > 0
      ? ["You have pending leave cancellation request(s)."]
      : []),
    ...(announcements.length > 0
      ? [`Latest announcement: ${announcements[0].title || announcements[0].message || "New announcement"}.`]
      : []),
    ...(canUseManagerTools && managerApprovals.length > 0
      ? [`Approval Center: ${managerApprovals.length} pending request(s).`]
      : []),
  ];

  const actionableNotificationCount =
    pendingCancellationRequests.length +
    leaveHistory.filter((leave) => String(leave.status || "").toLowerCase() === "pending").length +
    (canUseManagerTools
      ? managerApprovals.filter((request) => String(request.status || "").toUpperCase() === "PENDING").length
      : 0);

  const currentTimeLabel = getCurrentTime();
  const currentHour = Number(currentTimeLabel.slice(0, 2));
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  const firstName = employeeName.split(" ")[0] || "there";
  const todayShiftLabel = schedule?.scheduled_shift || "No schedule";
  const todayShiftTimeLabel = schedule?.scheduled_shift
    ? `${formatTime(schedule?.scheduled_in)} - ${formatTime(schedule?.scheduled_out)}`
    : "Check with your supervisor";

  /// FUNCTIONS
  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem("opscore_current_employee");

    if (!storedUser) {
      alert("No employee logged in.");
      window.location.href = "/portal";
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setCurrentUser(parsedUser);
    getCurrentUserPermissions(parsedUser);
  };

  const logout = () => {
    localStorage.removeItem("opscore_current_employee");
    localStorage.removeItem("opscore_current_employee_id");
    localStorage.removeItem("opscore_current_employee_name");

    window.location.href = "/portal";
  };

  const openTab = (tab: PortalTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const getCurrentUserName = () => {
    return (
      localStorage.getItem("opscore_current_employee_name") ||
      localStorage.getItem("opscore_current_user_name") ||
      localStorage.getItem("opscore_username") ||
      employeeName ||
      "OPSCORE Employee"
    );
  };

  const getCurrentUserPermissions = async (employee: any) => {
    if (!employee) {
      setRolePermissions([]);
      setApproverAssignments([]);
      setIsAssignedApprover(false);
      return;
    }

    const systemUserId = String(
      employee.system_user_id ||
        (typeof window !== "undefined"
          ? localStorage.getItem("opscore_current_system_user_id")
          : "") ||
        ""
    ).trim();

    const companyId = String(
      employee.company_id ||
        (typeof window !== "undefined"
          ? localStorage.getItem("opscore_current_company_id")
          : "") ||
        ""
    ).trim();

    if (systemUserId && companyId) {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_users")
        .select("id, role_id, is_active")
        .eq("user_id", systemUserId)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (companyUserError) {
        console.log("PORTAL COMPANY USER ERROR:", companyUserError.message);
        setRolePermissions([]);
      } else if (companyUser?.role_id) {
        const { data, error } = await supabase
          .from("role_permissions")
          .select("*")
          .eq("role_id", companyUser.role_id);

        if (error) {
          console.log("PORTAL ROLE PERMISSIONS ERROR:", error.message);
          setRolePermissions([]);
        } else {
          setRolePermissions(data || []);
        }
      } else {
        setRolePermissions([]);
      }
    } else {
      setRolePermissions([]);
    }

    const employeeId = String(employee.id || "").trim();
    const employeeNo = String(employee.employee_no || employee.employee_number || "").trim();
    const username = String(employee.username || "").trim();
    const employeeNameValue = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const { data: matchedAssignments, error: assignmentError } = await supabase
      .from("approval_assignments")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .limit(50);

    if (assignmentError) {
      console.log("PORTAL APPROVAL ASSIGNMENTS ERROR:", assignmentError.message);
      setApproverAssignments([]);
      setIsAssignedApprover(false);
      return;
    }

    const activeAssignments = (matchedAssignments || []).filter((assignment) => {
      const activeValue = assignment.is_active ?? true;
      return activeValue !== false && !!assignment.employee_id;
    });

    setApproverAssignments(activeAssignments);
    setIsAssignedApprover(activeAssignments.length > 0);
  };

  const getManagerApprovals = async () => {
    if (!isAssignedApprover) {
      setManagerApprovals([]);
      return;
    }

    const companyId = String(
      currentUser?.company_id ||
        (typeof window !== "undefined"
          ? localStorage.getItem("opscore_current_company_id")
          : "") ||
        ""
    ).trim();

    let query = supabase
      .from("approval_requests")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.log("PORTAL APPROVAL CENTER ERROR:", error.message);
      setManagerApprovals([]);
      return;
    }

    setManagerApprovals(data || []);
  };

  const getAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .or("is_active.eq.true,is_active.is.null")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.log("ANNOUNCEMENTS ERROR:", error.message);
      setAnnouncements([]);
      return;
    }

    setAnnouncements(data || []);
  };

  const submitAnnouncement = async () => {
    if (!canPostAnnouncements) {
      alert("You do not have permission to post announcements.");
      return;
    }

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert("Please enter announcement title and message.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("announcements").insert({
      title: announcementTitle.trim(),
      message: announcementMessage.trim(),
      body: announcementMessage.trim(),
      priority: announcementPriority,
      audience: "All Employees",
      posted_by: getCurrentUserName(),
      created_by: getCurrentUserName(),
      is_active: true,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementPriority("Normal");
    await getAnnouncements();
    alert("Announcement posted.");
    setLoading(false);
  };

  const getShiftDetails = async (shiftName: string | null) => {
    if (!shiftName || shiftName === "OFF") return null;

    const { data: shiftTemplate, error } = await supabase
      .from("shift_templates")
      .select("*")
      .eq("shift_name", shiftName)
      .maybeSingle();

    if (error) {
      console.log("SHIFT TEMPLATE ERROR:", error.message);
    }

    if (shiftTemplate) {
      return {
        scheduled_shift: shiftTemplate.shift_name,
        scheduled_in: shiftTemplate.start_time,
        scheduled_out: shiftTemplate.end_time,
      };
    }

    return fallbackShifts[shiftName] || null;
  };

  const getTodayAttendance = async (employeeId: string) => {
    const currentDate = getPhilippinesDate();

    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("attendance_date", currentDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("TODAY ATTENDANCE ERROR:", error.message);
      return;
    }

    setTodayAttendance(data);
  };

  const getTodaySchedule = async (employeeId: string) => {
    const { data: scheduleRow, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("day", getPhilippinesDate())
      .maybeSingle();

    if (scheduleError) {
      console.log("SCHEDULE ERROR:", scheduleError.message);
      setSchedule(null);
      return;
    }

    if (!scheduleRow || scheduleRow.shift === "OFF") {
      setSchedule(null);
      return;
    }

    const shiftDetails = await getShiftDetails(scheduleRow.shift);
    setSchedule(shiftDetails);
  };

  const getWeeklySchedules = async (employeeId: string) => {
    const weekDates = getWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];

    const { data: scheduleRows, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("day", weekStart)
      .lte("day", weekEnd);

    if (error) {
      console.log("WEEKLY SCHEDULE ERROR:", error.message);
      setWeeklySchedules([]);
      return;
    }

    const { data: templates } = await supabase.from("shift_templates").select("*");

    const mapped = weekDates.map((date) => {
      const row = (scheduleRows || []).find(
        (item) => String(item.day) === String(date)
      );

      if (!row || row.shift === "OFF") {
        return {
          day: date,
          shift: "OFF",
          scheduled_in: null,
          scheduled_out: null,
        };
      }

      const template = (templates || []).find(
        (item) => item.shift_name === row.shift
      );

      const fallback = fallbackShifts[row.shift];

      return {
        day: date,
        shift: row.shift,
        scheduled_in: template?.start_time || fallback?.scheduled_in || null,
        scheduled_out: template?.end_time || fallback?.scheduled_out || null,
      };
    });

    setWeeklySchedules(mapped);
  };

  const getAttendanceHistory = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("attendance_date", getLast30DaysStart())
      .lte("attendance_date", today)
      .order("attendance_date", { ascending: false })
      .limit(30);

    if (error) {
      console.log("ATTENDANCE HISTORY ERROR:", error.message);
      setAttendanceHistory([]);
      return;
    }

    setAttendanceHistory(data || []);
  };

  const getLeaveHistory = async (employeeId: string) => {
    const cleanEmployeeId = String(employeeId || "").trim();

    if (!cleanEmployeeId) {
      setLeaveHistory([]);
      return;
    }

    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", cleanEmployeeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.log("LEAVE HISTORY ERROR:", error.message);
      setLeaveHistory([]);
      return;
    }

    setLeaveHistory(data || []);
  };

  const getLeaveCredits = async (employeeId: string) => {
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `employee_id.eq.${employeeId}`,
      employeeNo ? `employee_no.eq.${employeeNo}` : "",
      employeeNameFilter ? `employee_name.eq.${employeeNameFilter}` : "",
    ].filter(Boolean);

    const query = supabase
      .from("employee_leave_credits")
      .select("*")
      .order("leave_type", { ascending: true });

    const { data, error } =
      filters.length > 0 ? await query.or(filters.join(",")) : await query.eq("employee_id", employeeId);

    if (error) {
      console.log("LEAVE CREDITS ERROR:", error.message);
      setLeaveCredits([]);
      return;
    }

    setLeaveCredits(data || []);
  };

  const getPendingCancellationRequests = async (employeeId: string) => {
    const cleanEmployeeId = String(employeeId || "").trim();

    if (!cleanEmployeeId) {
      setPendingCancellationRequests([]);
      return;
    }

    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from("approval_requests")
      .select("*")
      .eq("request_type", "LEAVE_CANCELLATION")
      .in("status", ["PENDING", "Pending"])
      .eq("request_payload->>employee_id", cleanEmployeeId)
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.log("PENDING CANCELLATION ERROR:", error.message);
      setPendingCancellationRequests([]);
      return;
    }

    setPendingCancellationRequests(data || []);
  };

  const getPayslips = async (employeeId: string) => {
    const cleanEmployeeId = String(employeeId || "").trim();

    if (!cleanEmployeeId) {
      setPayslips([]);
      return;
    }

    const companyId = await getCurrentCompanyId();
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `employee_id.eq.${cleanEmployeeId}`,
      employeeNo ? `employee_no.eq.${employeeNo}` : "",
      employeeNameFilter ? `employee_name.eq.${employeeNameFilter}` : "",
    ].filter(Boolean);

    let query = supabase
      .from("payroll_records")
      .select("*")
      .order("released_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(12);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: payrollRows, error } =
      filters.length > 0
        ? await query.or(filters.join(","))
        : await query.eq("employee_id", cleanEmployeeId);

    if (error) {
      console.log("PAYSLIP HISTORY ERROR:", error.message);
      setPayslips([]);
      return;
    }

    const releasedRows = (payrollRows || []).filter((row: any) => {
      const status = String(row.status || "").toUpperCase();
      const recordStatus = String(row.record_status || "").toUpperCase();
      const releaseStatus = String(row.release_status || "").toUpperCase();

      return (
        status === "RELEASED" ||
        recordStatus === "RELEASED" ||
        releaseStatus === "RELEASED" ||
        Boolean(row.released_at)
      );
    });

    const periodIds = Array.from(
      new Set(
        releasedRows
          .map((row: any) => row.period_id || row.payroll_period_id)
          .filter(Boolean),
      ),
    );

    let periodMap = new Map<string, any>();

    if (periodIds.length > 0) {
      const { data: periodRows, error: periodError } = await supabase
        .from("payroll_periods")
        .select("*")
        .in("id", periodIds);

      if (periodError) {
        console.log("PAYSLIP PERIOD LOOKUP ERROR:", periodError.message);
      } else {
        periodMap = new Map(
          (periodRows || []).map((period: any) => [String(period.id), period]),
        );
      }
    }

    const mappedPayslips = releasedRows.map((row: any) => {
      const periodId = row.period_id || row.payroll_period_id || null;
      const period = periodId ? periodMap.get(String(periodId)) || {} : {};
      const periodLabel =
        period.period_name ||
        period.period_label ||
        row.period_name ||
        row.period_label ||
        row.payroll_period ||
        row.cutoff_name ||
        "Released Payroll";

      return {
        ...row,
        payroll_period_id: periodId,
        period_id: periodId,
        period: periodLabel,
        period_name: periodLabel,
        payroll_period: periodLabel,
        cutoff_name: periodLabel,
        start_date: period.start_date || row.start_date || row.period_start_date || null,
        end_date: period.end_date || row.end_date || row.period_end_date || null,
        employee_id: row.employee_id || cleanEmployeeId,
        employee_no: row.employee_no || employeeNo || "",
        employee_name: row.employee_name || employeeNameFilter || employeeName || "Employee",
        department: row.department || currentUser?.department || "",
        position: row.position || currentUser?.position || "",
        gross_pay: Number(row.gross_pay || row.gross_amount || 0),
        total_deductions: Number(row.total_deductions ?? row.deductions ?? row.total_deduction ?? 0),
        deductions: Number(row.total_deductions ?? row.deductions ?? row.total_deduction ?? 0),
        net_pay: Number(row.net_pay ?? row.net_amount ?? row.release_amount ?? 0),
        final_pay: Number(row.net_pay ?? row.net_amount ?? row.release_amount ?? 0),
        release_amount: Number(row.release_amount ?? row.released_amount ?? row.net_pay ?? row.net_amount ?? 0),
        status: "RELEASED",
        created_at: row.released_at || row.created_at || null,
      };
    });

    setPayslips(mappedPayslips);
  };

  const getEmployeeBalances = async (employeeId: string) => {
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `employee_id.eq.${employeeId}`,
      employeeNameFilter ? `employee_name.eq.${employeeNameFilter}` : "",
      employeeNo ? `remarks.ilike.%${employeeNo}%` : "",
    ].filter(Boolean);

    const query = supabase
      .from("employee_balances")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data, error } =
      filters.length > 0 ? await query.or(filters.join(",")) : await query.eq("employee_id", employeeId);

    if (error) {
      console.log("EMPLOYEE BALANCES ERROR:", error.message);
      setEmployeeBalances([]);
      return;
    }

    setEmployeeBalances(data || []);
  };

  const reloadEmployeeData = async (employeeId: string) => {
    await Promise.all([
      getTodayAttendance(employeeId),
      getTodaySchedule(employeeId),
      getWeeklySchedules(employeeId),
      getAttendanceHistory(employeeId),
      getLeaveHistory(employeeId),
      getLeaveCredits(employeeId),
      getPendingCancellationRequests(employeeId),
      getManagerApprovals(),
      getAnnouncements(),
      getPayslips(employeeId),
      getEmployeeBalances(employeeId),
    ]);
  };

  const getPortalLocation = async (): Promise<PortalLocationCapture> => {
    const fallbackLocation: PortalLocationCapture = {
      latitude: null,
      longitude: null,
      accuracy: null,
      status: "GPS_UNAVAILABLE",
    };

    if (typeof window === "undefined" || !navigator.geolocation) {
      console.log("OPSCORE GPS: geolocation unavailable in this browser.");
      return fallbackLocation;
    }

    const mapGeolocationError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) return "PERMISSION_DENIED";
      if (error.code === error.POSITION_UNAVAILABLE) return "GPS_UNAVAILABLE";
      if (error.code === error.TIMEOUT) return "GPS_TIMEOUT";
      return "GPS_ERROR";
    };

    const readPosition = (options: PositionOptions) => {
      return new Promise<PortalLocationCapture>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("OPSCORE GPS CAPTURED:", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });

            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              status: "GPS_CAPTURED",
            });
          },
          (error) => {
            const status = mapGeolocationError(error);

            console.log("OPSCORE GPS ERROR:", {
              code: error.code,
              message: error.message,
              mappedStatus: status,
              options,
            });

            resolve({
              latitude: null,
              longitude: null,
              accuracy: null,
              status,
            });
          },
          options
        );
      });
    };

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        console.log("OPSCORE GPS PERMISSION:", permission.state);

        if (permission.state === "denied") {
          return {
            latitude: null,
            longitude: null,
            accuracy: null,
            status: "PERMISSION_DENIED",
          };
        }
      }
    } catch (permissionError) {
      console.log("OPSCORE GPS PERMISSION CHECK SKIPPED:", permissionError);
    }

    // Attempt 1: mobile-friendly read. This is more reliable indoors and on older phones.
    const mobileFriendlyLocation = await readPosition({
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 60000,
    });

    if (mobileFriendlyLocation.status === "GPS_CAPTURED") {
      return mobileFriendlyLocation;
    }

    if (mobileFriendlyLocation.status === "PERMISSION_DENIED") {
      return mobileFriendlyLocation;
    }

    // Attempt 2: strict GPS read. This may be more accurate when the phone has a clear signal.
    const highAccuracyLocation = await readPosition({
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    });

    return highAccuracyLocation;
  };

  const buildLocationRemark = (
    baseRemark: string | null | undefined,
    action: "Time In" | "Time Out",
    location: PortalLocationCapture
  ) => {
    const existingRemark = String(baseRemark || `Employee Portal ${action}`).trim();
    const locationRemark =
      location.status === "GPS_CAPTURED"
        ? `${action} GPS captured. Accuracy: ${Math.round(Number(location.accuracy || 0))}m.`
        : `${action} GPS status: ${location.status}.`;

    if (existingRemark.includes(`${action} GPS`)) return existingRemark;

    return `${existingRemark} | ${locationRemark}`;
  };

  const handleTimeIn = async () => {
    if (!currentUser) return;

    setLoading(true);

    const attendanceDate = getPhilippinesDate();
    const timeIn = getPhilippinesTime();
    const location = await getPortalLocation();

    const { data: existingEntry, error: existingError } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", currentUser.id)
      .eq("attendance_date", attendanceDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      alert(existingError.message);
      setLoading(false);
      return;
    }

    if (existingEntry?.time_in) {
      alert("You already timed in for today.");
      await reloadEmployeeData(currentUser.id);
      setLoading(false);
      return;
    }

    const lateMinutes = computeLateMinutes(
      existingEntry?.scheduled_in || schedule?.scheduled_in || null,
      timeIn
    );

    const attendancePayload = {
      employee_id: currentUser.id,
      attendance_date: attendanceDate,
      scheduled_shift:
        existingEntry?.scheduled_shift || schedule?.scheduled_shift || null,
      scheduled_in: existingEntry?.scheduled_in || schedule?.scheduled_in || null,
      scheduled_out:
        existingEntry?.scheduled_out || schedule?.scheduled_out || null,
      time_in: timeIn,
      time_out: null,
      late_minutes: lateMinutes,
      undertime_minutes: Number(existingEntry?.undertime_minutes || 0),
      ot_minutes: Number(existingEntry?.ot_minutes || 0),
      status: lateMinutes > 0 ? "Late" : "Present",
      remarks: buildLocationRemark(
        existingEntry?.remarks || "Employee Portal Time In",
        "Time In",
        location
      ),
      time_in_latitude: location.latitude,
      time_in_longitude: location.longitude,
      time_in_accuracy: location.accuracy,
      time_in_location_status: location.status,
    };

    const { error } = existingEntry?.id
      ? await supabase
          .from("attendance_entries")
          .update(attendancePayload)
          .eq("id", existingEntry.id)
      : await supabase.from("attendance_entries").insert(attendancePayload);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);

    if (location.status !== "GPS_CAPTURED") {
      alert(`Time In saved. GPS was not captured: ${location.status}.`);
    }
  };

  const handleTimeOut = async () => {
    if (!currentUser) return;

    setLoading(true);

    const attendanceDate = getPhilippinesDate();
    const location = await getPortalLocation();

    const { data: latestEntry, error: latestError } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", currentUser.id)
      .eq("attendance_date", attendanceDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      alert(latestError.message);
      setLoading(false);
      return;
    }

    if (!latestEntry?.time_in) {
      alert("Please time in first before timing out.");
      setLoading(false);
      return;
    }

    if (latestEntry?.time_out) {
      alert("You already timed out for today.");
      await reloadEmployeeData(currentUser.id);
      setLoading(false);
      return;
    }

    const timeOut = getPhilippinesTime();

    if (String(latestEntry.time_in || "").slice(0, 5) === timeOut) {
      const confirmSameMinute = confirm(
        "Time In and Time Out are the same minute. Continue only if this is intentional."
      );

      if (!confirmSameMinute) {
        setLoading(false);
        return;
      }
    }

    const scheduledOut =
      latestEntry.scheduled_out || schedule?.scheduled_out || null;

    const undertimeMinutes = computeUndertimeMinutes(scheduledOut, timeOut);
    const otMinutes = computeOTMinutes(scheduledOut, timeOut);

    const { error } = await supabase
      .from("attendance_entries")
      .update({
        time_out: timeOut,
        undertime_minutes: undertimeMinutes,
        ot_minutes: otMinutes,
        status: "Completed",
        remarks: buildLocationRemark(
          latestEntry.remarks || "Employee Portal Time Out",
          "Time Out",
          location
        ),
        time_out_latitude: location.latitude,
        time_out_longitude: location.longitude,
        time_out_accuracy: location.accuracy,
        time_out_location_status: location.status,
      })
      .eq("id", latestEntry.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);

    if (location.status !== "GPS_CAPTURED") {
      alert(`Time Out saved. GPS was not captured: ${location.status}.`);
    }
  };

  const getCurrentCompanyId = async () => {
    const storedCompanyId = String(
      currentUser?.company_id ||
        localStorage.getItem("opscore_current_company_id") ||
        ""
    ).trim();

    if (storedCompanyId) return storedCompanyId;

    if (!currentUser?.id) return "";

    const { data, error } = await supabase
      .from("employees")
      .select("company_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.log("GET CURRENT COMPANY ID ERROR:", error.message);
      return "";
    }

    const companyId = String(data?.company_id || "").trim();

    if (companyId) {
      setCurrentUser((previous: any) => ({
        ...(previous || currentUser),
        company_id: companyId,
      }));
      localStorage.setItem("opscore_current_company_id", companyId);
    }

    return companyId;
  };

  const findOverlappingLeave = async ({
    companyId,
    employeeId,
    startDateValue,
    endDateValue,
    statuses,
    excludedLeaveId,
  }: {
    companyId: string;
    employeeId: string;
    startDateValue: string;
    endDateValue: string;
    statuses: string[];
    excludedLeaveId?: string | number | null;
  }) => {
    let overlapQuery = supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, status")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .in("status", statuses)
      .lte("start_date", endDateValue)
      .gte("end_date", startDateValue)
      .order("start_date", { ascending: true })
      .limit(1);

    if (excludedLeaveId) {
      overlapQuery = overlapQuery.neq("id", excludedLeaveId);
    }

    return await overlapQuery;
  };

  const buildOverlapAlertMessage = (overlap: any) => {
    if (!overlap) {
      return "Leave request failed. One or more selected dates already exist in a pending or approved leave request.";
    }

    return `Leave request failed. The selected dates overlap with ${overlap.leave_type || "an existing leave"} from ${formatDate(overlap.start_date)} to ${formatDate(overlap.end_date)} (${overlap.status || "Active"}).`;
  };

  const submitLeaveRequest = async () => {
    if (!currentUser) return;

    const cleanReason = reason.trim();

    if (!startDate || !endDate || !cleanReason) {
      alert("Please complete leave request details, including the reason.");
      return;
    }

    if (cleanReason.length < 5) {
      alert("Please enter a valid leave reason with at least 5 characters.");
      return;
    }

    if (leaveDays <= 0) {
      alert("Invalid leave date range.");
      return;
    }

    const employeeNo = String(currentUser.employee_no || employeeNumber || "").trim();
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Unable to submit leave. No company_id found for this employee.");
      return;
    }

    setLoading(true);

    const { data: overlappingLeaves, error: overlapError } = await findOverlappingLeave({
      companyId,
      employeeId: currentUser.id,
      startDateValue: startDate,
      endDateValue: endDate,
      statuses: ["Pending", "Approved"],
    });

    if (overlapError) {
      alert(overlapError.message);
      setLoading(false);
      return;
    }

    if ((overlappingLeaves || []).length > 0) {
      alert(buildOverlapAlertMessage(overlappingLeaves?.[0]));
      setLoading(false);
      return;
    }

    const leavePayload = {
      company_id: companyId,
      employee_id: currentUser.id,
      employee_name: employeeName,
      employee_no: employeeNo || null,
      department: currentUser.department || null,
      position: currentUser.position || null,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days: leaveDays,
      total_days: leaveDays,
      reason: cleanReason,
      requested_by: getCurrentUserName(),
      requested_at: new Date().toISOString(),
    };

    const { data: leaveData, error: leaveError } = await supabase
      .from("leave_requests")
      .insert({
        company_id: companyId,
        employee_id: currentUser.id,
        employee_name: employeeName,
        employee_no: employeeNo || null,
        department: currentUser.department || null,
        position: currentUser.position || null,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days: leaveDays,
        reason: cleanReason,
        status: "Pending",
        requested_by: getCurrentUserName(),
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (leaveError) {
      alert(leaveError.message);
      setLoading(false);
      return;
    }

    const { error: approvalError } = await supabase
      .from("approval_requests")
      .insert({
        company_id: companyId,
        request_type: "LEAVE_REQUEST",
        module: "Leave Management",
        reference_id: leaveData.id,
        title: `Leave Request - ${employeeName}`,
        description: `${employeeName} requested ${leaveType} from ${startDate} to ${endDate} (${leaveDays} day/s). Reason: ${cleanReason}`,
        requested_by: getCurrentUserName(),
        status: "PENDING",
        request_payload: leavePayload,
      });

    if (approvalError) {
      await supabase
        .from("leave_requests")
        .update({
          status: "Draft",
          reason: `${cleanReason} | Approval request failed: ${approvalError.message}`,
        })
        .eq("id", leaveData.id);

      alert("Leave was saved, but approval request failed. Check approval_requests columns.");
      await getLeaveHistory(currentUser.id);
      setLoading(false);
      return;
    }

    setStartDate("");
    setEndDate("");
    setReason("");
    await reloadEmployeeData(currentUser.id);
    alert("Leave request submitted to Manager Approval Center.");
    setLoading(false);
  };

  const requestLeaveCancellation = async (leave: LeaveRequest) => {
    if (!currentUser || !leave?.id) return;

    if (!canCancelLeave(leave)) {
      alert("Only approved leaves without pending cancellation can be cancelled.");
      return;
    }

    setCancelLeaveModal(leave);
    setCancellationReason("");
  };

  const submitLeaveCancellationRequest = async () => {
    if (!currentUser || !cancelLeaveModal?.id) return;

    const leave = cancelLeaveModal;

    if (!cancellationReason.trim()) {
      alert("Cancellation reason is required.");
      return;
    }

    const days = Number(leave.days || leave.total_days || 0);
    const employeeNo = String(
      currentUser.employee_no || employeeNumber || leave.employee_no || ""
    ).trim();
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Unable to submit leave cancellation. No company_id found for this employee.");
      return;
    }

    const payload = {
      company_id: companyId,
      leave_id: leave.id,
      employee_id: leave.employee_id || currentUser.id,
      employee_name: leave.employee_name || employeeName,
      employee_no: employeeNo || null,
      department: leave.department || currentUser.department || null,
      position: leave.position || currentUser.position || null,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days,
      total_days: days,
      original_reason: leave.reason || "",
      cancellation_reason: cancellationReason.trim(),
      requested_by: getCurrentUserName(),
      requested_at: new Date().toISOString(),
    };

    setLoading(true);

    const { error } = await supabase.from("approval_requests").insert({
      company_id: companyId,
      request_type: "LEAVE_CANCELLATION",
      module: "Leave Management",
      reference_id: leave.id,
      title: `Leave Cancellation - ${employeeName}`,
      description: `${employeeName} requested cancellation of ${leave.leave_type} from ${leave.start_date} to ${leave.end_date}. Reason: ${cancellationReason.trim()}`,
      requested_by: getCurrentUserName(),
      status: "PENDING",
      request_payload: payload,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setCancelLeaveModal(null);
    setCancellationReason("");
    await reloadEmployeeData(currentUser.id);
    alert("Leave cancellation request submitted to Manager Approval Center.");
    setLoading(false);
  };

  const executeMobileCashDrawerMovement = async (request: ApprovalRequest) => {
    try {
      const payload = getApprovalPayload(request);

      const companyId =
        String(
          request.company_id ||
            payload.company_id ||
            currentUser?.company_id ||
            localStorage.getItem("opscore_current_company_id") ||
            "",
        ).trim() || (await getCurrentCompanyId());

      await executeCashDrawerApprovalAction({
        request,
        currentEmployeeName: getCurrentUserName(),
        currentEmployeeId: currentUser?.id || null,
        currentSystemUserId:
          currentUser?.system_user_id ||
          localStorage.getItem("opscore_current_system_user_id") ||
          null,
        companyId,
      });

      return true;
    } catch (error: any) {
      console.log("PORTAL CASH APPROVAL ACTION ERROR:", error?.message || error);
      alert(`Cash approval failed. ${error?.message || error}`);
      return false;
    }
  };


  const approveMobileApproval = async (request: ApprovalRequest) => {
  if (!canUseManagerTools || !request?.id) return;

  const requestType = String(request.request_type || "").toUpperCase();
  const payload = getApprovalPayload(request);
  const referenceId = request.reference_id || payload.leave_id;

  setActionLoadingId(request.id as string | number);

  if (CASH_DRAWER_REQUEST_TYPES.includes(requestType)) {
    const executed = await executeMobileCashDrawerMovement(request);

    if (!executed) {
      setActionLoadingId(null);
      return;
    }

    await getManagerApprovals();
    if (currentUser?.id) await reloadEmployeeData(currentUser.id);
    setActionLoadingId(null);
    alert("Cash approval completed and posted to movements.");
    return;
  }

  if (requestType === "LEAVE_REQUEST" && referenceId) {
    const approvalCompanyId = String(request.company_id || payload.company_id || currentUser?.company_id || "").trim();
    const approvalEmployeeId = String(payload.employee_id || "").trim();
    const approvalStartDate = String(payload.start_date || "").trim();
    const approvalEndDate = String(payload.end_date || "").trim();

    if (!approvalCompanyId || !approvalEmployeeId || !approvalStartDate || !approvalEndDate) {
      alert("Cannot approve leave. Missing company, employee, or date details in this approval request.");
      setActionLoadingId(null);
      return;
    }

    const { data: approvedOverlap, error: approvedOverlapError } = await findOverlappingLeave({
      companyId: approvalCompanyId,
      employeeId: approvalEmployeeId,
      startDateValue: approvalStartDate,
      endDateValue: approvalEndDate,
      statuses: ["Approved"],
      excludedLeaveId: referenceId,
    });

    if (approvedOverlapError) {
      alert(approvedOverlapError.message);
      setActionLoadingId(null);
      return;
    }

    if ((approvedOverlap || []).length > 0) {
      alert(`Cannot approve leave. This request overlaps with an already approved leave from ${formatDate(approvedOverlap?.[0]?.start_date)} to ${formatDate(approvedOverlap?.[0]?.end_date)}.`);
      setActionLoadingId(null);
      return;
    }

    const { error: leaveError } = await supabase
      .from("leave_requests")
      .update({
        status: "Approved",
        approved_by: getCurrentUserName(),
        approved_at: new Date().toISOString(),
      })
      .eq("id", referenceId);

    if (leaveError) {
      alert(leaveError.message);
      setActionLoadingId(null);
      return;
    }
  }

  if (requestType === "LEAVE_CANCELLATION" && referenceId) {
    const { error: leaveError } = await supabase
      .from("leave_requests")
      .update({
        status: "Cancelled",
        cancellation_reason: payload.cancellation_reason || request.description || null,
        cancelled_by: getCurrentUserName(),
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", referenceId);

    if (leaveError) {
      alert(leaveError.message);
      setActionLoadingId(null);
      return;
    }
  }

  const { error } = await supabase
    .from("approval_requests")
    .update({
      status: "APPROVED",
      approved_by: getCurrentUserName(),
      approved_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) {
    alert(error.message);
    setActionLoadingId(null);
    return;
  }

  await getManagerApprovals();
  if (currentUser?.id) await reloadEmployeeData(currentUser.id);
  setActionLoadingId(null);
  alert("Approval completed.");
};


  const rejectMobileApproval = async (request: ApprovalRequest) => {
    if (!canUseManagerTools || !request?.id) return;

    setRejectApprovalModal(request);
    setRejectionReason("");
  };

  const submitMobileApprovalRejection = async () => {
    if (!canUseManagerTools || !rejectApprovalModal?.id) return;

    const request = rejectApprovalModal;

    if (!rejectionReason.trim()) {
      alert("Rejection reason is required.");
      return;
    }

    const requestType = String(request.request_type || "").toUpperCase();
    const payload = getApprovalPayload(request);
    const referenceId = request.reference_id || payload.leave_id;

    setActionLoadingId(request.id as string | number);

    // CASH DRAWER SAFETY RULE:
    // Rejected cash requests must never post finance_cash_movements.
    // Only approval can call executeMobileCashDrawerMovement().

    if (requestType === "LEAVE_REQUEST" && referenceId) {
      const { error: leaveError } = await supabase
        .from("leave_requests")
        .update({
          status: "Rejected",
          rejected_by: getCurrentUserName(),
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", referenceId);

      if (leaveError) {
        alert(leaveError.message);
        setActionLoadingId(null);
        return;
      }
    }

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "REJECTED",
        rejected_by: getCurrentUserName(),
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", request.id);

    if (error) {
      alert(error.message);
      setActionLoadingId(null);
      return;
    }

    setRejectApprovalModal(null);
    setRejectionReason("");
    await getManagerApprovals();
    if (currentUser?.id) await reloadEmployeeData(currentUser.id);
    setActionLoadingId(null);
    alert("Request rejected.");
  };


  const getApprovalPayload = (request: ApprovalRequest) => {
    return request?.request_payload || {};
  };

  const getApprovalTypeLabel = (request: ApprovalRequest) => {
    const type = String(request?.request_type || "").replaceAll("_", " ").toLowerCase();

    if (type.includes("leave cancellation")) return "Leave Cancellation";
    if (type.includes("leave request")) return "Leave Request";
    if (type.includes("cash advance")) return "Cash Advance";
    if (type.includes("cash out")) return "Cash Out Request";
    if (type.includes("cash drawer")) return "Cash Drawer Request";
    if (type.includes("cash expense")) return "Cash Expense Release";
    if (type.includes("expense")) return "Expense Request";
    if (type.includes("owner withdrawal")) return "Owner Withdrawal";
    if (type.includes("bank deposit")) return "Bank Deposit";
    if (type.includes("remittance")) return "Remittance Request";
    if (type.includes("adjustment")) return "Adjustment Request";
    if (type.includes("payroll")) return "Payroll Request";
    if (type.includes("overtime") || type.includes("ot")) return "Overtime Request";
    if (type.includes("schedule")) return "Schedule Request";

    return type
      ? type.replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Approval Request";
  };

  const getApprovalEmployeeName = (request: ApprovalRequest) => {
    const payload = getApprovalPayload(request);

    return (
      payload.employee_name ||
      payload.requestor_name ||
      payload.requested_for ||
      payload.name ||
      payload.holder_name ||
      payload.drawer_holder ||
      payload.requester ||
      request.requested_by ||
      "Requestor"
    );
  };

  const getApprovalPrimaryDetail = (request: ApprovalRequest) => {
    const payload = getApprovalPayload(request);
    const type = String(request?.request_type || "").toUpperCase();

    if (type.includes("LEAVE")) {
      const leaveType = payload.leave_type || "Leave";
      const start = payload.start_date ? formatDate(payload.start_date) : "-";
      const end = payload.end_date ? formatDate(payload.end_date) : "-";
      return `${leaveType} â€¢ ${start} to ${end}`;
    }

    const amountValue =
      payload.amount ??
      payload.total_amount ??
      payload.request_amount ??
      payload.cash_amount ??
      payload.expense_amount ??
      null;

    if (amountValue !== null && amountValue !== undefined && amountValue !== "") {
      return formatMoney(amountValue);
    }

    if (payload.category || payload.payment_method || payload.source) {
      return [payload.category, payload.payment_method, payload.source].filter(Boolean).join(" â€¢ ");
    }

    if (payload.reason) return String(payload.reason);
    if (payload.purpose) return String(payload.purpose);
    if (payload.remarks) return String(payload.remarks);

    return request.description || "Review request details.";
  };

  const getApprovalReason = (request: ApprovalRequest) => {
    const payload = getApprovalPayload(request);

    return (
      payload.reason ||
      payload.purpose ||
      payload.remarks ||
      payload.description ||
      payload.notes ||
      request.description ||
      "No reason provided."
    );
  };

  const getApprovalSubmittedAt = (request: ApprovalRequest) => {
    if (!request.created_at) return "-";

    return new Date(request.created_at).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const pendingApprovalCount = managerApprovals.filter(
    (request) => String(request.status || "").toUpperCase() === "PENDING"
  ).length;

  const approvalBreakdown = {
    leave: managerApprovals.filter((request) =>
      String(request.request_type || "").toUpperCase().includes("LEAVE")
    ).length,
    expense: managerApprovals.filter((request) =>
      String(request.request_type || "").toUpperCase().includes("EXPENSE")
    ).length,
    cash: managerApprovals.filter((request) => {
      const type = String(request.request_type || "").toUpperCase();
      return type.includes("CASH") || type.includes("WITHDRAWAL") || type.includes("DEPOSIT");
    }).length,
    other: managerApprovals.filter((request) => {
      const type = String(request.request_type || "").toUpperCase();
      return !type.includes("LEAVE") && !type.includes("EXPENSE") && !type.includes("CASH") && !type.includes("WITHDRAWAL") && !type.includes("DEPOSIT");
    }).length,
  };

  const nextSchedule = weeklySchedules.find(
    (item) => item.shift && item.shift !== "OFF"
  );

  const openApprovalDetails = (request: ApprovalRequest) => {
    setSelectedApprovalModal(request);
  };


  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    reloadEmployeeData(currentUser.id);
  }, [currentUser, isAssignedApprover]);

  useEffect(() => {
    if (!currentUser?.id || !isAssignedApprover) return;

    const channel = supabase
      .channel(`employee-portal-approvals-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approval_requests",
        },
        async (payload) => {
          await getManagerApprovals();

          if (payload.eventType === "INSERT") {
            const request: any = payload.new;
            const type = String(request?.request_type || "Approval Request").replaceAll("_", " ");

            alert(`New approval request: ${type}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, isAssignedApprover]);

  /// UI
  // OPSCORE V1.3 Vincent mobile app shell: full-width violet header, floating shift card, large attendance buttons, app-style quick actions.
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {menuOpen && (
        <button
          aria-label="Close employee portal menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-dvh w-80 max-w-[86vw] transform overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-xl shadow-slate-200/70">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">VINCENT</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/30 bg-white/20 text-lg font-black text-white shadow-sm">
              {firstName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black">{employeeName}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-blue-100">{employeeDepartment}</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-xs font-bold text-white">
            Employee #{employeeNumber}
          </p>
        </div>

        <nav className="mt-5 space-y-2">
          {portalMenuItems.map((item) => {
            const active = activeTab === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() => openTab(item.key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                    : "border border-slate-200 bg-white/80 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.4} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
        >
          Logout
        </button>
      </aside>

      <section className="mx-auto min-h-screen max-w-md bg-white pb-28 shadow-2xl shadow-slate-950/10 sm:max-w-6xl sm:pb-10">
        <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 pb-20 pt-8 text-white shadow-xl shadow-slate-200/70">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-24 bottom-5 h-56 w-56 rounded-full bg-blue-300/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-8 right-0 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-white/10 [clip-path:polygon(0_45%,45%_100%,100%_40%,100%_100%,0_100%)]" />
          <div className="pointer-events-none absolute right-20 top-28 grid grid-cols-5 gap-2 opacity-20">
            {Array.from({ length: 25 }).map((_, index) => (
              <span key={`header-dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-white" />
            ))}
          </div>

          <div className="relative flex items-center justify-between gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open employee menu"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-black text-white shadow-sm backdrop-blur transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              <Menu size={22} strokeWidth={2.6} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.28em] text-blue-100">VINCENT RESORT HOTEL</p>
              <h1 className="mt-1 truncate text-lg font-black tracking-tight text-white">Employee Portal</h1>
            </div>

            <button
              onClick={() => openTab("announcements")}
              aria-label="Open announcements"
              className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-lg font-black text-white shadow-sm backdrop-blur transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              <Bell size={20} strokeWidth={2.6} />
              {actionableNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white shadow-md">
                  {Math.min(actionableNotificationCount, 9)}
                </span>
              )}
            </button>

            <button
              onClick={() => openTab("profile")}
              aria-label="Open profile"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 text-base font-black text-white shadow-sm backdrop-blur transition-all duration-200 hover:bg-white/25 active:scale-[0.98]"
            >
              {firstName.slice(0, 1).toUpperCase()}
            </button>
          </div>

          <div className="relative mt-9 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">{greeting}</p>
              <h2 className="mt-2 line-clamp-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">{employeeName}</h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-blue-100">
                {employeeDepartment}
              </p>
              <p className="text-xs font-bold leading-5 text-blue-100/90">
                Employee #{employeeNumber}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-right shadow-sm backdrop-blur">
              <p className="text-2xl font-black text-white">{currentTimeLabel}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">PH Time</p>
            </div>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="-mt-8 space-y-4 px-5 sm:px-6">
            <section className="relative z-10 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Today&apos;s Work</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Work Status</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                  {today}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <Clock3 size={21} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Shift</p>
                      <p className="mt-0.5 text-base font-black leading-5 text-slate-950">
                        {todayShiftLabel === "No schedule" ? "No Schedule Assigned" : todayShiftLabel}
                      </p>
                      <p className="text-xs font-semibold leading-5 text-slate-500">{todayShiftTimeLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={21} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Attendance</p>
                      <p className="mt-0.5 text-base font-black leading-5 text-slate-950">{todayAttendance?.status || "Not Timed In"}</p>
                      <p className="text-xs font-semibold leading-5 text-slate-500">
                        {formatTime(todayAttendance?.time_in)} - {formatTime(todayAttendance?.time_out)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleTimeIn}
                  disabled={loading || !!todayAttendance?.time_in || !currentUser}
                  className="min-h-[72px] rounded-2xl bg-emerald-600 px-4 py-3 text-left text-white shadow-lg shadow-emerald-100 transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="block text-sm font-black">Time In</span>
                  <span className="mt-1 block text-xs font-semibold text-emerald-50">
                    {todayAttendance?.time_in ? formatTime(todayAttendance.time_in) : "Start shift"}
                  </span>
                </button>

                <button
                  onClick={handleTimeOut}
                  disabled={loading || !todayAttendance?.time_in || !!todayAttendance?.time_out}
                  className="min-h-[72px] rounded-2xl bg-blue-700 px-4 py-3 text-left text-white shadow-lg shadow-blue-100 transition-all duration-200 hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="block text-sm font-black">Time Out</span>
                  <span className="mt-1 block text-xs font-semibold text-blue-50">
                    {todayAttendance?.time_out ? formatTime(todayAttendance.time_out) : "End shift"}
                  </span>
                </button>
              </div>
            </section>

            {canUseManagerTools && (
              <section className="rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Approval Center</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                      {pendingApprovalCount} Pending Request{pendingApprovalCount === 1 ? "" : "s"}
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Mobile approval queue from the main Approval Center.
                    </p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white shadow-md shadow-blue-100">
                    <ShieldCheck size={23} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-2xl border border-blue-100 bg-white p-3">
                  <ApprovalBreakdownRow label="Leave Requests" value={approvalBreakdown.leave} />
                  <ApprovalBreakdownRow label="Expense Requests" value={approvalBreakdown.expense} />
                  <ApprovalBreakdownRow label="Cash / Finance" value={approvalBreakdown.cash} />
                  <ApprovalBreakdownRow label="Other Requests" value={approvalBreakdown.other} />
                </div>

                <button
                  onClick={() => openTab("approvals")}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-200 transition-all duration-200 hover:bg-blue-800 active:scale-[0.99]"
                >
                  Open Approval Center
                  <ShieldCheck size={17} strokeWidth={2.5} />
                </button>
              </section>
            )}

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Next Schedule</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Upcoming Shift</h3>
                </div>
                <button
                  onClick={() => openTab("schedule")}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"
                >
                  View
                </button>
              </div>

              <button
                onClick={() => openTab("schedule")}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white text-center shadow-sm">
                  <p className="bg-blue-700 px-4 py-1 text-[10px] font-black uppercase text-white">
                    {new Date(`${(nextSchedule?.day || today)}T00:00:00`).toLocaleDateString("en-PH", { month: "short" })}
                  </p>
                  <p className="px-4 py-1 text-3xl font-black text-blue-700">
                    {new Date(`${(nextSchedule?.day || today)}T00:00:00`).getDate()}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-black leading-5 text-slate-950">
                    {nextSchedule?.shift && nextSchedule.shift !== "OFF" ? nextSchedule.shift : todayShiftLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                    {nextSchedule?.scheduled_in
                      ? `${formatTime(nextSchedule.scheduled_in)} - ${formatTime(nextSchedule.scheduled_out)}`
                      : todayShiftTimeLabel}
                  </p>
                </div>
              </button>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Actions</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Quick Actions</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <EnterpriseActionCard label="Payslip" helper="View payroll" icon={<PhilippinePeso size={22} strokeWidth={2.5} />} onClick={() => openTab("payslip")} />
                <EnterpriseActionCard label="Leave Request" helper="File or track" icon={<FileText size={22} strokeWidth={2.5} />} onClick={() => openTab("leave")} />
                <EnterpriseActionCard label="Attendance" helper="History" icon={<CheckCircle2 size={22} strokeWidth={2.5} />} onClick={() => openTab("attendance")} />
                <EnterpriseActionCard label="Cash Advance" helper="Balances" icon={<WalletCards size={22} strokeWidth={2.5} />} onClick={() => openTab("cashadvance")} />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">HR Balance</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Leave Balances</h3>
                </div>
                <button
                  onClick={() => openTab("leave")}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600"
                >
                  View
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {(leaveCredits.length > 0
                  ? leaveCredits.slice(0, 5)
                  : [
                      { leave_type: "Vacation Leave", remaining_credits: 0 },
                      { leave_type: "Sick Leave", remaining_credits: 0 },
                      { leave_type: "Emergency Leave", remaining_credits: 0 },
                    ]
                ).map((credit, index) => (
                  <div key={`${credit.leave_type}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="text-sm font-bold leading-5 text-slate-700">{credit.leave_type || "Leave"}</p>
                    <p className="shrink-0 text-sm font-black text-slate-950">{Number(credit.remaining_credits || 0)} day{Number(credit.remaining_credits || 0) === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="pb-2">
              <button
                onClick={() => openTab("announcements")}
                className="flex w-full items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                  <Megaphone size={22} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Latest Announcement</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">{announcements[0]?.title || "No announcements available"}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                    {announcements[0]?.message || announcements[0]?.body || "Company updates and notices will appear here."}
                  </p>
                </div>
              </button>
            </section>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Schedule" title="My Weekly Schedule">
              <div className="space-y-3">
                {weeklySchedules.map((item) => (
                  <div key={item.day} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{formatWeekday(item.day)}, {formatDate(item.day)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {item.shift === "OFF" ? "Rest day" : `${formatTime(item.scheduled_in)} - ${formatTime(item.scheduled_out)}`}
                      </p>
                    </div>
                    <StatusBadge status={item.shift} />
                  </div>
                ))}
                {weeklySchedules.length === 0 && <EmptyStateInline title="No schedule loaded" helper="Your weekly schedule will appear here once published." />}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Performance" title="Attendance Summary">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Score" value={`${attendanceScore}%`} helper={attendanceScoreLabel} />
                <MiniMetric label="Present" value={presentCount} helper="Last 30 days" />
                <MiniMetric label="Late" value={lateCount} helper="Records" />
                <MiniMetric label="Absent" value={absentCount} helper="Records" />
              </div>
            </PortalCard>

            <PortalCard label="Recent Logs" title="Attendance History">
              <div className="space-y-3">
                {attendanceHistory.map((entry) => (
                  <div key={entry.id || `${entry.attendance_date}-${entry.time_in}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{formatWeekday(entry.attendance_date)}, {formatDate(entry.attendance_date)}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{formatTime(entry.time_in)} - {formatTime(entry.time_out)}</p>
                      </div>
                      <StatusBadge status={entry.status || "Pending"} />
                    </div>
                  </div>
                ))}
                {attendanceHistory.length === 0 && <EmptyStateInline title="No attendance records" helper="Your attendance records will show here after time in." />}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Employee Score" title="Performance Snapshot">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Attendance" value={`${attendanceScore}%`} helper={attendanceScoreLabel} />
                <MiniMetric label="Present" value={presentCount} helper="Last 30 days" />
                <MiniMetric label="Late" value={lateCount} helper="Needs watch" />
                <MiniMetric label="Undertime" value={undertimeCount} helper="Records" />
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "leave" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Available Balance" title="Leave Credits">
              <div className="grid grid-cols-1 gap-3">
                {leaveCredits.map((credit) => (
                  <div key={`${credit.id || credit.leave_type}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{credit.leave_type || "Leave"}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{Number(credit.remaining_credits || 0)}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">Used: {Number(credit.used_credits || 0)}</p>
                  </div>
                ))}
                {leaveCredits.length === 0 && <EmptyStateInline title="No leave credits found" helper="Admin must load leave credits first." />}
              </div>
            </PortalCard>

            <PortalCard label="Submit for Approval" title="Request Leave">
              <div className="space-y-4">
                <FormLabel label="Leave Type" />
                <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
                  <option>Vacation Leave</option>
                  <option>Sick Leave</option>
                  <option>Emergency Leave</option>
                  <option>Unpaid Leave</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel label="Start Date" />
                    <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                  <div>
                    <FormLabel label="End Date" />
                    <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                </div>

                <div>
                  <FormLabel label="Reason" />
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter leave reason" className="mt-2 min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">Total request: {leaveDays} day(s)</div>
                <button onClick={submitLeaveRequest} disabled={loading} className="h-11 w-full rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50">Submit Leave Request</button>
              </div>
            </PortalCard>

            <PortalCard label="Recent Requests" title="Leave History">
              <div className="space-y-3">
                {leaveHistory.map((leave) => (
                  <div key={`${leave.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{leave.leave_type}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(leave.start_date)} - {formatDate(leave.end_date)} â€¢ {leave.days || leave.total_days} day(s)</p>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{leave.reason}</p>
                    {canCancelLeave(leave) && (
                      <button onClick={() => requestLeaveCancellation(leave)} className="mt-3 h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 hover:bg-red-100">
                        Request Cancellation
                      </button>
                    )}
                  </div>
                ))}
                {leaveHistory.length === 0 && <EmptyStateInline title="No leave requests" helper="Submitted leave requests will appear here." />}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "payslip" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Payroll" title="Payslips">
              <div className="space-y-3">
                {payslips.map((payslip) => (
                  <button key={`${payslip.id}`} onClick={() => setActivePayslip(payslip)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{getPayslipPeriodLabel(payslip)}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">Net Pay / Release Amount</p>
                      </div>
                      <p className="text-lg font-black text-emerald-700">{formatMoney(getPayslipNet(payslip))}</p>
                    </div>
                  </button>
                ))}
                {payslips.length === 0 && <EmptyStateInline title="No payslips found" helper="Released payroll snapshots will appear here." />}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "cashadvance" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Balances" title="Cash Advances">
              <div className="grid grid-cols-1 gap-3">
                <MiniMetric label="Active Balance" value={formatMoney(totalActiveBalance)} helper="All balances" />
                <MiniMetric label="Cash Advance" value={formatMoney(totalCashAdvanceRemaining)} helper="Remaining" />
                <MiniMetric label="Payroll Balance" value={formatMoney(payrollSalaryBalances.reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0))} helper="Salary related" />
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Company Updates" title="Announcements">
              {canPostAnnouncements && (
                <div className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                        Manager Broadcast
                      </p>
                      <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                        Post Announcement
                      </h3>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white">
                      <Megaphone size={21} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={announcementTitle}
                      onChange={(event) => setAnnouncementTitle(event.target.value)}
                      placeholder="Announcement title"
                      className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
                    />

                    <textarea
                      value={announcementMessage}
                      onChange={(event) => setAnnouncementMessage(event.target.value)}
                      placeholder="Write announcement details..."
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
                    />

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <select
                        value={announcementPriority}
                        onChange={(event) => setAnnouncementPriority(event.target.value)}
                        className="h-11 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Important">Important</option>
                        <option value="Urgent">Urgent</option>
                      </select>

                      <button
                        onClick={submitAnnouncement}
                        disabled={loading}
                        className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div key={`${announcement.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{announcement.title || "Announcement"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {announcement.posted_by || announcement.created_by || "OPSCORE"}
                        </p>
                      </div>
                      <StatusBadge status={announcement.priority || "Normal"} />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{announcement.message || announcement.body}</p>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <EmptyStateInline
                    title="No announcements"
                    helper={canPostAnnouncements ? "Post a company update for employees." : "Company announcements will appear here."}
                  />
                )}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "approvals" && canUseManagerTools && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Mobile Approval Center" title="Approval Center Queue">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Pending Approvals</p>
                <p className="mt-1 text-3xl font-black text-slate-950">{pendingApprovalCount}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Mirrors the main Approval Center queue.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {managerApprovals.map((request) => (
                  <div key={`${request.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                          {getApprovalTypeLabel(request)}
                        </p>
                        <p className="mt-1 truncate text-base font-black text-slate-950">
                          {getApprovalEmployeeName(request)}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                          {getApprovalPrimaryDetail(request)}
                        </p>
                      </div>
                      <StatusBadge status={request.status || "Pending"} />
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                      {getApprovalReason(request)}
                    </p>

                    <div className="mt-3 text-[11px] font-semibold text-slate-500">
                      Submitted: {getApprovalSubmittedAt(request)}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => openApprovalDetails(request)}
                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => approveMobileApproval(request)}
                        disabled={actionLoadingId === request.id}
                        className="h-10 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectMobileApproval(request)}
                        disabled={actionLoadingId === request.id}
                        className="h-10 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {managerApprovals.length === 0 && (
                  <EmptyStateInline
                    title="No pending approvals"
                    helper="All pending Approval Center requests assigned to your approver access will appear here."
                  />
                )}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-4 px-5 pt-5">
            <PortalCard label="Employee Details" title="Profile">
              <div className="rounded-3xl border border-slate-200 bg-blue-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-3xl bg-blue-700 text-2xl font-black text-white">{firstName.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-slate-950">{employeeName}</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-600">{employeeDepartment}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Employee #{employeeNumber}</p>
                  </div>
                </div>
              </div>
              <button onClick={logout} className="mt-4 h-11 w-full rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-[0.98]">
                Logout
              </button>
            </PortalCard>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-3 pt-2 shadow-2xl backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {[
              { key: "home", label: "Home", icon: Home },
              ...(canUseManagerTools
                ? [{ key: "approvals", label: "Approvals", icon: ShieldCheck }]
                : [{ key: "schedule", label: "Schedule", icon: CalendarDays }]),
              { key: "schedule", label: "Schedule", icon: CalendarDays },
              { key: "leave", label: "Leave", icon: FileText },
              { key: "profile", label: "Profile", icon: UserCircle },
            ]
              .filter((item, index, array) => array.findIndex((entry) => entry.key === item.key) === index)
              .map((item) => {
                const active = activeTab === item.key;
                const Icon = item.icon;

                return (
                  <button
                    key={`bottom-${item.key}`}
                    onClick={() => openTab(item.key as PortalTab)}
                    className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[12px] font-semibold transition-all duration-200 ${
                      active
                        ? "bg-blue-700 text-white shadow-md shadow-slate-200"
                        : "bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <span className="grid h-5 w-5 place-items-center">
                      <Icon size={18} strokeWidth={2.4} />
                    </span>
                    <span className="mt-1 max-w-full truncate">{item.label}</span>
                  </button>
                );
              })}
          </div>
        </nav>

        {cancelLeaveModal && (
          <ModalShell title="Request Leave Cancellation">
            <p className="text-sm font-medium leading-6 text-slate-600">
              Submit a cancellation request for {cancelLeaveModal.leave_type} from {formatDate(cancelLeaveModal.start_date)} to {formatDate(cancelLeaveModal.end_date)}.
            </p>
            <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Reason for cancellation" className="mt-4 min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setCancelLeaveModal(null)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Cancel</button>
              <button onClick={submitLeaveCancellationRequest} disabled={loading} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">Submit</button>
            </div>
          </ModalShell>
        )}

        {selectedApprovalModal && (
          <ModalShell title="Approval Details">
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                  {getApprovalTypeLabel(selectedApprovalModal)}
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {getApprovalEmployeeName(selectedApprovalModal)}
                </p>
                <p className="mt-1 font-semibold text-slate-600">
                  {getApprovalPrimaryDetail(selectedApprovalModal)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Reason / Description</p>
                <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 font-medium leading-6 text-slate-700">
                  {getApprovalReason(selectedApprovalModal)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoTile label="Requested By" value={selectedApprovalModal.requested_by || "-"} />
                <InfoTile label="Submitted" value={getApprovalSubmittedAt(selectedApprovalModal)} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedApprovalModal(null)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const request = selectedApprovalModal;
                  setSelectedApprovalModal(null);
                  approveMobileApproval(request);
                }}
                disabled={actionLoadingId === selectedApprovalModal.id}
                className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const request = selectedApprovalModal;
                  setSelectedApprovalModal(null);
                  rejectMobileApproval(request);
                }}
                disabled={actionLoadingId === selectedApprovalModal.id}
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </ModalShell>
        )}

        {rejectApprovalModal && (
          <ModalShell title="Reject Approval">
            <p className="text-sm font-medium leading-6 text-slate-600">Provide a reason for rejecting this request.</p>
            <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Rejection reason" className="mt-4 min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setRejectApprovalModal(null)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Cancel</button>
              <button onClick={submitMobileApprovalRejection} disabled={actionLoadingId === rejectApprovalModal.id} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">Reject</button>
            </div>
          </ModalShell>
        )}

        {activePayslip && (
          <ModalShell title="Payslip Details">
            <div className="space-y-3">
              <InfoRow label="Period" value={getPayslipPeriodLabel(activePayslip)} />
              <InfoRow label="Gross Pay" value={formatMoney(getPayslipGross(activePayslip))} />
              <InfoRow label="Deductions" value={formatMoney(getPayslipDeductions(activePayslip))} />
              <InfoRow label="Net Pay" value={formatMoney(getPayslipNet(activePayslip))} highlight />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setActivePayslip(null)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">Close</button>
              <button onClick={() => downloadPayslipPDF(activePayslip)} className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-violet-700 active:scale-[0.98]">Print</button>
            </div>
          </ModalShell>
        )}
      </section>
    </main>
  );
}



function ModalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span
        className={`text-right text-sm font-black ${
          highlight ? "text-emerald-700" : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "normal" ||
    normalized === "present" ||
    normalized === "completed" ||
    normalized === "released"
      ? "bg-emerald-500/10 text-emerald-400"
      : normalized === "pending" || normalized === "draft"
      ? "bg-blue-50 text-slate-700"
      : normalized === "late"
      ? "bg-red-500/10 text-red-700"
      : normalized === "undertime" ||
        normalized === "absent" ||
        normalized === "rejected" ||
        normalized === "urgent"
      ? "bg-red-500/10 text-red-400"
      : normalized === "cancelled"
      ? "bg-slate-500/10 text-slate-700"
      : normalized === "active"
      ? "bg-blue-50 text-slate-700"
      : "bg-slate-700 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}


function MobileSectionHeader({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[22px] font-bold tracking-tight text-slate-950">{title}</h3>
      {action && (
        <button onClick={onClick} className="text-sm font-bold text-blue-700">
          {action}
        </button>
      )}
    </div>
  );
}

function MobileActionCard({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: string;
  tone: "violet" | "emerald" | "blue" | "amber";
  onClick: () => void;
}) {
  const toneClass =
    tone === "violet"
      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-violet-100"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-blue-100"
      : "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-100";

  const iconClass =
    tone === "violet"
      ? "bg-blue-700 shadow-slate-200"
      : tone === "emerald"
      ? "bg-emerald-500 shadow-emerald-200"
      : tone === "blue"
      ? "bg-blue-500 shadow-blue-200"
      : "bg-amber-500 shadow-amber-200";

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-3 text-center shadow-sm transition-all duration-200 active:scale-[0.98] ${toneClass}`}
    >
      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl text-xl font-black text-white shadow-lg ${iconClass}`}>
        {icon}
      </span>
      <span className="mt-2 block text-[12px] font-semibold leading-tight text-slate-700">{label}</span>
    </button>
  );
}

function LeaveCreditMiniCard({
  index,
  title,
  value,
}: {
  index: number;
  title: string;
  value: number;
}) {
  const toneClass =
    index === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : index === 1
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  const icon = index === 0 ? "â˜˜" : index === 1 ? "â™¥" : "âš¡";

  return (
    <div className={`rounded-3xl border p-3 shadow-sm ${toneClass}`}>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-xl shadow-sm">{icon}</div>
      <p className="mt-3 truncate text-[11px] font-semibold text-slate-600">{title}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      <p className="text-[11px] font-medium text-slate-500">Days Left</p>
    </div>
  );
}

function PortalCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function EmptyStateInline({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function FormLabel({ label }: { label: string }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </label>
  );
}




function ApprovalBreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function EnterpriseActionCard({
  label,
  helper,
  icon,
  onClick,
}: {
  label: string;
  helper: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-black leading-5 text-slate-950">{label}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-500">{helper}</span>
      </span>
    </button>
  );
}

function InfoTile({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value || "-"}</p>
    </div>
  );
}





