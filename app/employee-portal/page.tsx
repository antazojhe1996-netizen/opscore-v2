"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

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
};

type LeaveRequest = {
  id?: string | number;
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
  const today = new Date().toISOString().split("T")[0];

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

  const menuItems: { key: PortalTab; label: string; icon: string }[] = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "schedule", label: "My Schedule", icon: "📅" },
    { key: "attendance", label: "Attendance", icon: "🕒" },
    { key: "performance", label: "Performance", icon: "⭐" },
    { key: "leave", label: "Leave", icon: "📝" },
    { key: "payslip", label: "Payslips", icon: "💰" },
    { key: "cashadvance", label: "Cash Advances", icon: "💵" },
    { key: "announcements", label: "Announcements", icon: "📢" },
    { key: "manager", label: "Manager Tools", icon: "🛡️" },
    { key: "profile", label: "Profile", icon: "👤" },
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

  const portalMenuItems = menuItems.filter(
    (item) => item.key !== "manager" || canUseManagerTools
  );

  const getMinutes = (time: string | null) => {
    if (!time) return 0;

    const cleanTime = String(time).slice(0, 5);
    const [hours, minutes] = cleanTime.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
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
                <div class="muted">${employeeDepartment} • Employee #${employeeNumber}</div>
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

  const getWeekDates = () => {
    const current = new Date(`${today}T00:00:00`);
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date.toISOString().split("T")[0];
    });
  };

  const getLast30DaysStart = () => {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
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
      : ["No schedule loaded for today."]),
    ...(leaveHistory.some((leave) => String(leave.status || "").toLowerCase() === "pending")
      ? ["You have pending leave request(s)."]
      : []),
    ...(pendingCancellationRequests.length > 0
      ? ["You have pending leave cancellation request(s)."]
      : []),
    ...(leaveCredits.length > 0
      ? [`Remaining leave credits: ${totalRemainingLeaveCredits}.`]
      : []),
    ...(announcements.length > 0
      ? [`Latest announcement: ${announcements[0].title || announcements[0].message || "New announcement"}.`]
      : []),
    ...(canUseManagerTools && managerApprovals.length > 0
      ? [`Manager tools: ${managerApprovals.length} pending approval(s).`]
      : []),
  ];

  /// FUNCTIONS
  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem("opscore_current_employee");

    if (!storedUser) {
      alert("No employee logged in.");
      window.location.href = "/login";
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

    window.location.href = "/login";
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

    if (employee.system_role_id) {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_id", employee.system_role_id);

      if (error) {
        console.log("PORTAL ROLE PERMISSIONS ERROR:", error.message);
        setRolePermissions([]);
      } else {
        setRolePermissions(data || []);
      }
    } else {
      setRolePermissions([]);
    }

    const employeeId = String(employee.id || "").trim();
    const systemUserId = String(employee.system_user_id || "").trim();
    const employeeNo = String(employee.employee_no || employee.employee_number || "").trim();
    const username = String(employee.username || "").trim();
    const employeeNameValue = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const lookupPairs = [
      { column: "approver_employee_id", value: employeeId },
      { column: "approver_id", value: employeeId },
      { column: "approver_user_id", value: systemUserId },
      { column: "system_user_id", value: systemUserId },
      { column: "employee_id", value: employeeId },
      { column: "assigned_employee_id", value: employeeId },
      { column: "user_id", value: employeeId },
      { column: "approver_employee_no", value: employeeNo },
      { column: "employee_no", value: employeeNo },
      { column: "username", value: username },
      { column: "approver_username", value: username },
      { column: "approver_name", value: employeeNameValue },
      { column: "employee_name", value: employeeNameValue },
    ].filter((item) => item.value);

    let matchedAssignments: any[] = [];

    for (const lookup of lookupPairs) {
      const { data, error } = await supabase
        .from("approval_assignments")
        .select("*")
        .eq(lookup.column, lookup.value)
        .limit(20);

      if (!error && data && data.length > 0) {
        matchedAssignments = data;
        break;
      }
    }

    const activeAssignments = matchedAssignments.filter((assignment) => {
      const activeValue = assignment.is_active ?? assignment.active ?? true;
      const status = String(assignment.status || "Active").toLowerCase();
      return activeValue !== false && !["inactive", "disabled", "archived"].includes(status);
    });

    setApproverAssignments(activeAssignments);
    setIsAssignedApprover(activeAssignments.length > 0);
  };

  const getManagerApprovals = async () => {
    if (!isAssignedApprover) {
      setManagerApprovals([]);
      return;
    }

    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .in("request_type", ["LEAVE_REQUEST", "LEAVE_CANCELLATION"])
      .eq("status", "PENDING")
      .order("id", { ascending: false })
      .limit(50);

    if (error) {
      console.log("MANAGER APPROVALS ERROR:", error.message);
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
    if (!canUseManagerTools) {
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
    const { data, error } = await supabase
      .from("attendance_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
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
      .eq("day", today)
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
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `employee_id.eq.${employeeId}`,
      employeeNo ? `employee_id.eq.${employeeNo}` : "",
      employeeNo ? `employee_no.eq.${employeeNo}` : "",
      employeeNameFilter ? `employee_name.eq.${employeeNameFilter}` : "",
    ].filter(Boolean);

    const query = supabase
      .from("leave_requests")
      .select("*")
      .order("id", { ascending: false })
      .limit(50);

    const { data, error } =
      filters.length > 0 ? await query.or(filters.join(",")) : await query.eq("employee_id", employeeId);

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
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `request_payload->>employee_id.eq.${employeeId}`,
      employeeNo ? `request_payload->>employee_id.eq.${employeeNo}` : "",
      employeeNo ? `request_payload->>employee_no.eq.${employeeNo}` : "",
      employeeNameFilter ? `request_payload->>employee_name.eq.${employeeNameFilter}` : "",
    ].filter(Boolean);

    let query = supabase
      .from("approval_requests")
      .select("*")
      .eq("request_type", "LEAVE_CANCELLATION")
      .eq("status", "PENDING")
      .order("id", { ascending: false });

    const { data, error } =
      filters.length > 0 ? await query.or(filters.join(",")) : await query;

    if (error) {
      console.log("PENDING CANCELLATION ERROR:", error.message);
      setPendingCancellationRequests([]);
      return;
    }

    setPendingCancellationRequests(data || []);
  };

  const getPayslips = async (employeeId: string) => {
    const employeeNo = String(currentUser?.employee_no || employeeNumber || "").trim();
    const shortEmployeeNo = employeeNo.replace(/^BIO-/i, "");
    const bioEmployeeNo = employeeNo && employeeNo.startsWith("BIO-")
      ? employeeNo
      : shortEmployeeNo
      ? `BIO-${shortEmployeeNo.padStart(3, "0")}`
      : "";
    const employeeNameFilter = employeeName.trim();

    const filters = [
      `employee_id.eq.${employeeId}`,
      employeeNo ? `employee_no.eq.${employeeNo}` : "",
      shortEmployeeNo ? `employee_no.eq.${shortEmployeeNo}` : "",
      bioEmployeeNo ? `employee_no.eq.${bioEmployeeNo}` : "",
      employeeNameFilter ? `employee_name.eq.${employeeNameFilter}` : "",
    ].filter(Boolean);

    const query = supabase
      .from("payroll_snapshots")
      .select("*")
      .order("id", { ascending: false })
      .limit(12);

    const { data, error } =
      filters.length > 0 ? await query.or(filters.join(",")) : await query.eq("employee_id", employeeId);

    if (error) {
      console.log("PAYSLIP HISTORY ERROR:", error.message);
      setPayslips([]);
      return;
    }

    setPayslips(data || []);
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

  const handleTimeIn = async () => {
    if (!currentUser) return;

    setLoading(true);

    const timeIn = getCurrentTime();
    const lateMinutes = computeLateMinutes(schedule?.scheduled_in, timeIn);

    const { error } = await supabase.from("attendance_entries").insert({
      employee_id: currentUser.id,
      attendance_date: today,
      scheduled_shift: schedule?.scheduled_shift || null,
      scheduled_in: schedule?.scheduled_in || null,
      scheduled_out: schedule?.scheduled_out || null,
      time_in: timeIn,
      time_out: null,
      late_minutes: lateMinutes,
      undertime_minutes: 0,
      ot_minutes: 0,
      status: lateMinutes > 0 ? "Late" : "Present",
      remarks: null,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);
  };

  const handleTimeOut = async () => {
    if (!currentUser || !todayAttendance) return;

    setLoading(true);

    const timeOut = getCurrentTime();
    const scheduledOut =
      todayAttendance.scheduled_out || schedule?.scheduled_out || null;

    const undertimeMinutes = computeUndertimeMinutes(scheduledOut, timeOut);
    const otMinutes = computeOTMinutes(scheduledOut, timeOut);

    const { error } = await supabase
      .from("attendance_entries")
      .update({
        time_out: timeOut,
        undertime_minutes: undertimeMinutes,
        ot_minutes: otMinutes,
        status: "Completed",
      })
      .eq("id", todayAttendance.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadEmployeeData(currentUser.id);
    setLoading(false);
  };

  const submitLeaveRequest = async () => {
    if (!currentUser) return;

    if (!startDate || !endDate || !reason.trim()) {
      alert("Please complete leave request details.");
      return;
    }

    if (leaveDays <= 0) {
      alert("Invalid leave date range.");
      return;
    }

    const employeeNo = String(currentUser.employee_no || employeeNumber || "").trim();

    const leavePayload = {
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
      reason: reason.trim(),
      requested_by: getCurrentUserName(),
      requested_at: new Date().toISOString(),
    };

    setLoading(true);

    const { data: leaveData, error: leaveError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: currentUser.id,
        employee_name: employeeName,
        employee_no: employeeNo || null,
        department: currentUser.department || null,
        position: currentUser.position || null,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days: leaveDays,
        reason: reason.trim(),
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
        request_type: "LEAVE_REQUEST",
        module: "Leave Management",
        reference_id: leaveData.id,
        title: `Leave Request - ${employeeName}`,
        description: `${employeeName} requested ${leaveType} from ${startDate} to ${endDate} (${leaveDays} day/s). Reason: ${reason.trim()}`,
        requested_by: getCurrentUserName(),
        status: "PENDING",
        request_payload: leavePayload,
      });

    if (approvalError) {
      await supabase
        .from("leave_requests")
        .update({
          status: "Draft",
          reason: `${reason.trim()} | Approval request failed: ${approvalError.message}`,
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

    const payload = {
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

  const approveMobileApproval = async (request: ApprovalRequest) => {
    if (!canUseManagerTools || !request?.id) return;

    const requestType = String(request.request_type || "").toUpperCase();
    const payload = request.request_payload || {};
    const referenceId = request.reference_id || payload.leave_id;

    setActionLoadingId(request.id as string | number);

    if (requestType === "LEAVE_REQUEST" && referenceId) {
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
    const payload = request.request_payload || {};
    const referenceId = request.reference_id || payload.leave_id;

    setActionLoadingId(request.id as string | number);

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
        description: `${request.description || ""}\nRejected reason: ${rejectionReason.trim()}`,
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

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    reloadEmployeeData(currentUser.id);
  }, [currentUser, isAssignedApprover]);

  /// UI
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {menuOpen && (
        <button
          aria-label="Close employee portal menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
className={`fixed left-0 top-0 z-40 h-dvh w-80 max-w-[86vw] transform overflow-y-auto border-r border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/40 transition-transform duration-300 ${          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">
            OPSCORE
          </p>
          <h2 className="mt-3 text-xl font-black">{employeeName}</h2>
          <p className="mt-1 text-sm text-slate-400">{employeeDepartment}</p>
          <p className="mt-1 text-xs text-slate-500">Employee #{employeeNumber}</p>
        </div>

        <nav className="mt-5 space-y-2">
          {portalMenuItems.map((item) => {
            const active = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => openTab(item.key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  active
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-5 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 hover:bg-red-500/20"
        >
          Logout
        </button>
      </aside>

      <section className="mx-auto max-w-5xl p-4 pb-10 sm:p-6">
        <header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-900 bg-slate-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg font-black text-amber-400"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                OPSCORE Employee App
              </p>
              <h1 className="truncate text-lg font-black sm:text-2xl">
                {portalMenuItems.find((item) => item.key === activeTab)?.label || "Home"}
              </h1>
            </div>

            <div className="hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 sm:block">
              Active
            </div>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 shadow-xl shadow-black/20">
              <p className="text-sm font-bold text-amber-200">Quick Attendance</p>
              <h2 className="mt-2 text-3xl font-black">Time In / Time Out</h2>
              <p className="mt-1 text-sm text-slate-300">
                Use this first when starting or ending your shift.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleTimeIn}
                  disabled={loading || !!todayAttendance?.time_in || !currentUser}
                  className="rounded-2xl bg-emerald-500 px-5 py-5 text-lg font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Time In
                </button>

                <button
                  onClick={handleTimeOut}
                  disabled={
                    loading ||
                    !todayAttendance?.time_in ||
                    !!todayAttendance?.time_out
                  }
                  className="rounded-2xl bg-amber-400 px-5 py-5 text-lg font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Time Out
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Info label="Time In" value={formatTime(todayAttendance?.time_in)} />
                <Info label="Time Out" value={formatTime(todayAttendance?.time_out)} />
                <Info label="Status" value={todayAttendance?.status || "Not timed in"} />
                <Info label="Late" value={todayAttendance?.late_minutes ?? 0} />
              </div>
            </section>

            <TodayScheduleCard
              schedule={schedule}
              formatTime={formatTime}
              onScheduleClick={() => openTab("schedule")}
            />

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black">Notifications</h2>
              <p className="mt-1 text-sm text-slate-400">Important updates from your employee portal.</p>

              <div className="mt-4 space-y-3">
                {portalNotifications.map((message, index) => (
                  <div
                    key={`${message}-${index}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200"
                  >
                    {message}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-5">
            <TodayScheduleCard
              schedule={schedule}
              formatTime={formatTime}
              onScheduleClick={() => {}}
            />

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black">This Week</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your published schedule for the current week.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                {weeklySchedules.map((item) => {
                  const isToday = item.day === today;

                  return (
                    <div
                      key={item.day}
                      className={`rounded-2xl border p-4 ${
                        isToday
                          ? "border-amber-400/50 bg-amber-400/10"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        {formatWeekday(item.day)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-300">
                        {formatDate(item.day)}
                      </p>
                      <p
                        className={`mt-3 text-lg font-black ${
                          item.shift === "OFF" ? "text-slate-500" : "text-amber-400"
                        }`}
                      >
                        {item.shift}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(item.scheduled_in)} - {formatTime(item.scheduled_out)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === "attendance" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black">Attendance History</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your latest attendance entries from the last 30 days.
            </p>

            <div className="mt-4 max-h-[70vh] overflow-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Time In</th>
                    <th className="px-4 py-3">Time Out</th>
                    <th className="px-4 py-3 text-right">Late</th>
                    <th className="px-4 py-3 text-right">Undertime</th>
                    <th className="px-4 py-3 text-right">OT</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceHistory.map((entry) => (
                    <tr key={entry.id || entry.attendance_date} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-bold">
                        {formatDate(entry.attendance_date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-amber-400">
                          {entry.scheduled_shift || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTime(entry.scheduled_in)} - {formatTime(entry.scheduled_out)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{formatTime(entry.time_in)}</td>
                      <td className="px-4 py-3">{formatTime(entry.time_out)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-300">{entry.late_minutes || 0}m</td>
                      <td className="px-4 py-3 text-right font-bold text-red-300">{entry.undertime_minutes || 0}m</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-300">{entry.ot_minutes || 0}m</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status || "Pending"} />
                      </td>
                    </tr>
                  ))}

                  {attendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        No attendance history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "performance" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black">Attendance Performance</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Based on your latest attendance records.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-5">
                <p className="text-xs uppercase tracking-widest text-slate-500">Score</p>
                <p className="text-4xl font-black text-amber-400">{attendanceScore}</p>
                <p className="text-sm font-bold text-slate-400">{attendanceScoreLabel}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Info label="Present" value={presentCount} />
              <Info label="Late" value={lateCount} />
              <Info label="Undertime" value={undertimeCount} />
              <Info label="Absent" value={absentCount} />
            </div>
          </section>
        )}

        {activeTab === "leave" && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">Employee Leave Center</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Request leave, track approvals, view credits, and request cancellation for approved leave.
                  </p>
                </div>

                <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1 text-xs font-black">
                  <button
                    onClick={() => setLeaveView("request")}
                    className={`rounded-xl px-4 py-2 ${
                      leaveView === "request" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    Request
                  </button>
                  <button
                    onClick={() => setLeaveView("history")}
                    className={`rounded-xl px-4 py-2 ${
                      leaveView === "history" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Info label="Pending" value={leaveStatuses.pending} />
                <Info label="Approved" value={leaveStatuses.approved} />
                <Info label="Cancelled" value={leaveStatuses.cancelled} />
                <Info label="Credits Left" value={totalRemainingLeaveCredits} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black">Remaining Leave Credits</h2>
              <p className="mt-1 text-sm text-slate-400">
                Credits are read from employee_leave_credits. Approved leave deductions remain handled by Approval Center.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Info label="Credit Types" value={leaveCredits.length} />
                <Info label="Used Credits" value={totalUsedLeaveCredits} />
                <Info label="Remaining Credits" value={totalRemainingLeaveCredits} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {leaveCredits.map((credit) => (
                  <div
                    key={credit.id || `${credit.leave_type}-${credit.employee_no}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">{credit.leave_type || "Leave Credit"}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {credit.status || "Active"}</p>
                      </div>
                      <StatusBadge status={credit.status || "Active"} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-slate-500">Total</p>
                        <p className="mt-1 text-lg font-black text-white">{credit.total_credits ?? credit.earned_credits ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-slate-500">Used</p>
                        <p className="mt-1 text-lg font-black text-red-300">{credit.used_credits ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-slate-500">Left</p>
                        <p className="mt-1 text-lg font-black text-emerald-300">{credit.remaining_credits ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {leaveCredits.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500 sm:col-span-2">
                    No leave credits found yet.
                  </div>
                )}
              </div>
            </section>

            {leaveView === "request" && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-black">Request Leave</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Submitted requests go directly to Manager Approval Center.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                  >
                    <option>Vacation Leave</option>
                    <option>Sick Leave</option>
                    <option>Emergency Leave</option>
                    <option>Unpaid Leave</option>
                  </select>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                    />

                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm">
                    Days: <span className="font-bold text-amber-400">{leaveDays}</span>
                  </div>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason"
                    className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 p-3"
                  />

                  <button
                    onClick={submitLeaveRequest}
                    disabled={loading || !currentUser}
                    className="rounded-xl bg-amber-400 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Submit to Approval Center
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">My Leave Requests</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Status tracker for Pending, Approved, Rejected, Cancelled, and cancellation requests.
                  </p>
                </div>
                <button
                  onClick={() => currentUser?.id && reloadEmployeeData(currentUser.id)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {leaveHistory.map((leave) => {
                  const pendingCancel = leave.id ? isLeaveCancellationPending(leave.id) : false;

                  return (
                    <div
                      key={leave.id || `${leave.start_date}-${leave.end_date}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">{leave.leave_type}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)} • {leave.days} day(s)
                          </p>
                          <p className="mt-2 text-sm text-slate-300">{leave.reason}</p>

                          {leave.rejection_reason && (
                            <p className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                              Rejection reason: {leave.rejection_reason}
                            </p>
                          )}

                          {leave.cancellation_reason && (
                            <p className="mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
                              Cancellation reason: {leave.cancellation_reason}
                            </p>
                          )}

                          {pendingCancel && (
                            <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-300">
                              Cancellation request pending in Approval Center.
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <StatusBadge status={leave.status} />
                          {canCancelLeave(leave) && (
                            <button
                              onClick={() => requestLeaveCancellation(leave)}
                              disabled={loading}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Cancel Approved Leave
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {leaveHistory.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                    No leave requests yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "payslip" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black">My Payslips</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your payroll snapshots and downloadable payslips will appear here.
            </p>

            <div className="mt-4 space-y-3">
              {payslips.map((payslip) => {
                const gross = getPayslipGross(payslip);
                const deductions = getPayslipDeductions(payslip);
                const net = getPayslipNet(payslip);
                const period = getPayslipPeriodLabel(payslip);

                return (
                  <div
                    key={payslip.id || period}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-white">{period}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatDate(payslip.start_date)} - {formatDate(payslip.end_date)}
                        </p>
                        {payslip.snapshot_type && (
                          <p className="mt-1 text-xs font-bold text-blue-300">
                            {payslip.snapshot_type}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={payslip.status || "Released"} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Info label="Gross" value={formatMoney(gross)} />
                      <Info label="Deductions" value={formatMoney(deductions)} />
                      <Info label="Net Pay" value={formatMoney(net)} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => setActivePayslip(payslip)}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
                      >
                        View Payslip
                      </button>

                      <button
                        onClick={() => downloadPayslipPDF(payslip)}
                        className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
                      >
                        Download / Print PDF
                      </button>
                    </div>
                  </div>
                );
              })}

              {payslips.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                  No payslips found yet. Ask payroll to generate a payroll snapshot first.
                </div>
              )}
            </div>
          </section>
        )}


        {activeTab === "cashadvance" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black">My Cash Advances & Balances</h2>
            <p className="mt-1 text-sm text-slate-400">
              Track cash advances, payroll balances, deductions, and remaining amounts.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Info label="Active Balances" value={activeEmployeeBalances.length} />
              <Info label="Cash Advance Remaining" value={formatMoney(totalCashAdvanceRemaining)} />
              <Info label="Total Active Balance" value={formatMoney(totalActiveBalance)} />
            </div>

            <div className="mt-5 space-y-3">
              {employeeBalances.map((balance) => (
                <div
                  key={balance.id || `${balance.balance_type}-${balance.created_at}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-white">{balance.balance_type || "Employee Balance"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Source: {balance.source_module || "-"} • {formatDate(String(balance.created_at || "").slice(0, 10))}
                      </p>
                    </div>
                    <StatusBadge status={balance.status || "Active"} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Info label="Original Amount" value={formatMoney(balance.original_amount || 0)} />
                    <Info label="Remaining Balance" value={formatMoney(balance.remaining_balance || 0)} />
                  </div>

                  {balance.remarks && (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                      {balance.remarks}
                    </div>
                  )}
                </div>
              ))}

              {employeeBalances.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                  No cash advances or balances found.
                </div>
              )}
            </div>
          </section>
        )}


        {activeTab === "announcements" && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">Announcements</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Official updates for employees and managers.
                  </p>
                </div>
                <button
                  onClick={getAnnouncements}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id || `${announcement.title}-${announcement.created_at}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-white">
                          {announcement.title || "Announcement"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          {announcement.message || announcement.body || "-"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Posted by {announcement.posted_by || announcement.created_by || "Admin"} •{" "}
                          {announcement.created_at
                            ? new Date(announcement.created_at).toLocaleString("en-PH")
                            : "-"}
                        </p>
                      </div>
                      <StatusBadge status={announcement.priority || "Normal"} />
                    </div>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                    No announcements yet.
                  </div>
                )}
              </div>
            </section>

            {canUseManagerTools && (
              <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
                <h2 className="text-lg font-black">Post Announcement</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Managers can post mobile announcements directly from the portal.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Announcement title"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-amber-400"
                  />

                  <select
                    value={announcementPriority}
                    onChange={(e) => setAnnouncementPriority(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-amber-400"
                  >
                    <option>Normal</option>
                    <option>Important</option>
                    <option>Urgent</option>
                  </select>

                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Type announcement message..."
                    className="min-h-32 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-amber-400"
                  />

                  <button
                    onClick={submitAnnouncement}
                    disabled={loading}
                    className="rounded-xl bg-amber-400 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Post Announcement
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "manager" && canUseManagerTools && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black">Manager Mobile Approvals</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Approve or reject pending leave requests from mobile.
                </p>
              </div>

              <button
                onClick={getManagerApprovals}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {managerApprovals.map((request) => {
                const payload = request.request_payload || {};
                const requestType = String(request.request_type || "").replaceAll("_", " ");

                return (
                  <div
                    key={request.id || `${request.request_type}-${request.reference_id}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                          {requestType}
                        </p>
                        <p className="mt-1 font-black text-white">
                          {payload.employee_name || request.title || "Pending Approval"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {payload.leave_type || "-"} • {formatDate(payload.start_date)} - {formatDate(payload.end_date)} •{" "}
                          {payload.days || payload.total_days || 0} day(s)
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          {payload.original_reason && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
                              Original reason: {payload.original_reason}
                            </div>
                          )}
                          {payload.reason && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
                              Reason: {payload.reason}
                            </div>
                          )}
                          {payload.cancellation_reason && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200">
                              Cancellation reason: {payload.cancellation_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <StatusBadge status={request.status || "PENDING"} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => rejectMobileApproval(request)}
                        disabled={actionLoadingId === request.id}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approveMobileApproval(request)}
                        disabled={actionLoadingId === request.id}
                        className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}

              {managerApprovals.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                  No pending mobile approvals.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black">My Profile</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Name" value={employeeName} />
              <Info label="Employee No." value={employeeNumber} />
              <Info label="Department" value={currentUser?.department || "-"} />
              <Info label="Position" value={currentUser?.position || "-"} />
            </div>

            <button
              onClick={logout}
              className="mt-5 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-black text-red-300 hover:bg-red-500/20"
            >
              Logout
            </button>
          </section>
        )}
      </section>

      {cancelLeaveModal && (
        <CancelLeaveModal
          leave={cancelLeaveModal}
          reason={cancellationReason}
          setReason={setCancellationReason}
          formatDate={formatDate}
          loading={loading}
          onClose={() => {
            setCancelLeaveModal(null);
            setCancellationReason("");
          }}
          onSubmit={submitLeaveCancellationRequest}
        />
      )}

      {rejectApprovalModal && (
        <RejectApprovalModal
          request={rejectApprovalModal}
          reason={rejectionReason}
          setReason={setRejectionReason}
          formatDate={formatDate}
          loading={actionLoadingId === (rejectApprovalModal.id as string | number)}
          onClose={() => {
            setRejectApprovalModal(null);
            setRejectionReason("");
          }}
          onSubmit={submitMobileApprovalRejection}
        />
      )}

      {activePayslip && (
        <PortalPayslipModal
          payslip={activePayslip}
          employeeName={employeeName}
          employeeNumber={employeeNumber}
          employeeDepartment={employeeDepartment}
          formatMoney={formatMoney}
          formatDate={formatDate}
          getPayslipPeriodLabel={getPayslipPeriodLabel}
          getPayslipGross={getPayslipGross}
          getPayslipDeductions={getPayslipDeductions}
          getPayslipNet={getPayslipNet}
          onDownload={() => downloadPayslipPDF(activePayslip)}
          onClose={() => setActivePayslip(null)}
        />
      )}
    </main>
  );
}


function CancelLeaveModal({
  leave,
  reason,
  setReason,
  formatDate,
  loading,
  onClose,
  onSubmit,
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="border-b border-slate-800 pb-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">
            Cancel Approved Leave
          </p>
          <h2 className="mt-2 text-2xl font-black">{leave.leave_type}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {formatDate(leave.start_date)} - {formatDate(leave.end_date)} •{" "}
            {leave.days || leave.total_days || 0} day(s)
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Original Reason</p>
          <p className="mt-1 text-sm text-slate-200">{leave.reason || "-"}</p>
        </div>

        <label className="mt-4 block text-sm font-bold text-slate-300">
          Reason for cancellation
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Example: Schedule conflict, emergency, no longer needed..."
          className="mt-2 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm outline-none focus:border-red-400"
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-900 disabled:opacity-40"
          >
            Close
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-2xl bg-red-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-red-300 disabled:opacity-40"
          >
            Submit Request
          </button>
        </div>
      </section>
    </div>
  );
}


function RejectApprovalModal({
  request,
  reason,
  setReason,
  formatDate,
  loading,
  onClose,
  onSubmit,
}: any) {
  const payload = request.request_payload || {};
  const requestType = String(request.request_type || "Approval").replaceAll("_", " ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="border-b border-slate-800 pb-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">
            Reject Approval Request
          </p>
          <h2 className="mt-2 text-2xl font-black">{requestType}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {payload.employee_name || request.title || "Pending Approval"}
          </p>
          {(payload.start_date || payload.end_date) && (
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(payload.start_date)} - {formatDate(payload.end_date)} •{" "}
              {payload.days || payload.total_days || 0} day(s)
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {payload.reason && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Original Reason</p>
              <p className="mt-1 text-sm text-slate-200">{payload.reason}</p>
            </div>
          )}

          {payload.cancellation_reason && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs uppercase tracking-widest text-red-300">Cancellation Reason</p>
              <p className="mt-1 text-sm text-red-100">{payload.cancellation_reason}</p>
            </div>
          )}
        </div>

        <label className="mt-4 block text-sm font-bold text-slate-300">
          Reason for rejection
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this request is rejected..."
          className="mt-2 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm outline-none focus:border-red-400"
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-900 disabled:opacity-40"
          >
            Close
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-2xl bg-red-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-red-300 disabled:opacity-40"
          >
            Reject Request
          </button>
        </div>
      </section>
    </div>
  );
}

function PortalPayslipModal({
  payslip,
  employeeName,
  employeeNumber,
  employeeDepartment,
  formatMoney,
  formatDate,
  getPayslipPeriodLabel,
  getPayslipGross,
  getPayslipDeductions,
  getPayslipNet,
  onDownload,
  onClose,
}: any) {
  const gross = getPayslipGross(payslip);
  const deductions = getPayslipDeductions(payslip);
  const net = getPayslipNet(payslip);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">OPSCORE Payslip</p>
            <h2 className="mt-2 text-2xl font-black">{getPayslipPeriodLabel(payslip)}</h2>
            <p className="mt-1 text-sm text-slate-400">Review your payroll summary before printing or saving as PDF.</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Net Pay</p>
          <h3 className="mt-2 text-4xl font-black text-emerald-300">{formatMoney(net)}</h3>
          <p className="mt-1 text-sm text-emerald-100/80">Amount payable after approved deductions.</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Info label="Employee" value={employeeName} />
          <Info label="Employee No." value={employeeNumber} />
          <Info label="Department" value={employeeDepartment} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-black text-emerald-300">Earnings</h3>
            <div className="mt-3 space-y-2 text-sm">
              <LineItem label="Basic Pay" value={formatMoney(payslip.basic_pay || 0)} />
              <LineItem label="OT Pay" value={formatMoney(payslip.ot_pay || 0)} />
              <LineItem label="Allowances / Incentives" value={formatMoney(Number(payslip.allowances || 0) + Number(payslip.incentives || 0))} />
              <LineItem label="Gross Pay" value={formatMoney(gross)} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-black text-red-300">Deductions</h3>
            <div className="mt-3 space-y-2 text-sm">
              <LineItem label="Late Deduction" value={formatMoney(payslip.late_deduction || 0)} />
              <LineItem label="Undertime Deduction" value={formatMoney(payslip.undertime_deduction || 0)} />
              <LineItem label="Absent Deduction" value={formatMoney(payslip.absence_deduction || 0)} />
              <LineItem label="Cash Advance / Other" value={formatMoney(Number(payslip.cash_advance || 0) + Number(payslip.other_deductions || 0))} />
              <LineItem label="Total Deductions" value={formatMoney(deductions)} strong />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Info label="Gross Pay" value={formatMoney(gross)} />
          <Info label="Deductions" value={formatMoney(deductions)} />
          <Info label="Issued" value={payslip.created_at ? formatDate(String(payslip.created_at).slice(0, 10)) : "-"} />
        </div>

        <button
          onClick={onDownload}
          className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-amber-300"
        >
          Download / Print PDF
        </button>
      </section>
    </div>
  );
}

function LineItem({ label, value, strong }: { label: string; value: any; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 ${strong ? "font-black text-white" : "text-slate-300"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TodayScheduleCard({
  schedule,
  formatTime,
  onScheduleClick,
}: {
  schedule: any;
  formatTime: (time?: string | null) => string;
  onScheduleClick: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">Today&apos;s Schedule</p>
          <h2 className="text-2xl font-black">
            {schedule?.scheduled_shift || "No schedule"}
          </h2>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-400">Shift Time</p>
          <p className="text-lg font-black text-amber-400">
            {formatTime(schedule?.scheduled_in)} - {formatTime(schedule?.scheduled_out)}
          </p>
        </div>
      </div>

      <button
        onClick={onScheduleClick}
        className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
      >
        View Weekly Schedule
      </button>
    </section>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
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
      ? "bg-amber-500/10 text-amber-400"
      : normalized === "late"
      ? "bg-orange-500/10 text-orange-400"
      : normalized === "undertime" ||
        normalized === "absent" ||
        normalized === "rejected" ||
        normalized === "urgent"
      ? "bg-red-500/10 text-red-400"
      : normalized === "cancelled"
      ? "bg-slate-500/10 text-slate-300"
      : normalized === "active"
      ? "bg-blue-500/10 text-blue-300"
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${style}`}>
      {status}
    </span>
  );
}
