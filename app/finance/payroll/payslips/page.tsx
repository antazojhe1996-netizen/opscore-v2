"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, Printer, Search, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import OpscoreAssistant from "@/components/OpscoreAssistant";
import { supabase } from "@/app/lib/supabase";

export default function PayslipsPage() {
  /// STATES
  const [periods, setPeriods] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activePayslip, setActivePayslip] = useState<any | null>(null);

  /// HELPERS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value: any) => {
    if (!value) return "-";
    const raw = String(value).slice(0, 10);
    return raw || "-";
  };

  const formatDateTime = (value: any) => {
    if (!value) return "-";
    return String(value).slice(0, 19).replace("T", " ");
  };

  const getCurrentCompanyId = () => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("opscore_current_company_id") ||
      localStorage.getItem("opscore_company_id") ||
      localStorage.getItem("company_id") ||
      ""
    );
  };

  const getPeriodLabel = (period: any) =>
    period?.period_name ||
    period?.period_label ||
    period?.payroll_period ||
    period?.release_no ||
    "Payroll Period";

  const getRecordPeriodLabel = (record: any) =>
    record.period_label ||
    record.period_name ||
    record.payroll_period ||
    getPeriodLabel(selectedPeriod);

  const getGovernmentDeductionTotal = (record: any) =>
    Number(record.sss_deduction || 0) +
    Number(record.philhealth_deduction || 0) +
    Number(record.pagibig_deduction || 0) +
    Number(record.tax_deduction || 0);

  const getAutoDeductionTotal = (record: any) =>
    Number(record.late_deduction || 0) +
    Number(record.undertime_deduction || 0) +
    Number(record.absent_deduction || 0);

  const getBalanceDeduction = (record: any) =>
    Number(
      record.balance_deduction ||
        record.cash_advance_deduction ||
        record.ca_deduction ||
        0,
    );

  const getDisplayedTotalDeductions = (record: any) =>
    Number(record.deductions ?? record.total_deductions ?? 0);

  const getDisplayedNetPay = (record: any) => Number(record.net_pay || 0);

  const getReleasedAmount = (record: any) =>
    Number(record.released_amount || record.release_amount || record.paid_amount || 0);

  const getRemainingAmount = (record: any) =>
    Math.max(
      Number(
        record.remaining_amount ??
          record.remaining_payroll_balance ??
          getDisplayedNetPay(record) - getReleasedAmount(record),
      ),
      0,
    );

  const isPayrollReleased = (record: any) =>
    String(record.status || "").toUpperCase() === "RELEASED" ||
    String(record.release_status || "").toUpperCase() === "RELEASED" ||
    String(record.record_status || "").toUpperCase() === "RELEASED";

  const isPayrollPartial = (record: any) =>
    String(record.status || "").toUpperCase().includes("PARTIAL") ||
    String(record.release_status || "").toUpperCase().includes("PARTIAL") ||
    (getReleasedAmount(record) > 0 && getRemainingAmount(record) > 0);

  const getEmail = (record: any) =>
    record.email || record.employee_email || record.employees?.email || "";

  const mapById = (rows: any[] = []) =>
    new Map(rows.map((row) => [String(row.id), row]));

  const mapEmployees = (rows: any[] = []) =>
    new Map(rows.map((row) => [String(row.id), row]));

  const findSnapshotItem = (
    snapshotItems: any[],
    snapshotId: string,
    releasedItem: any,
  ) => {
    const employeeId = String(releasedItem.employee_id || "");
    const employeeName = String(releasedItem.employee_name || "");

    return (
      snapshotItems.find(
        (item) =>
          String(item.snapshot_id) === String(snapshotId) &&
          employeeId &&
          String(item.employee_id) === employeeId,
      ) ||
      snapshotItems.find(
        (item) =>
          String(item.snapshot_id) === String(snapshotId) &&
          employeeName &&
          String(item.employee_name) === employeeName,
      ) ||
      null
    );
  };

  /// DATA LOADERS
  const getPeriods = async () => {
    const currentCompanyId = getCurrentCompanyId();

    let periodQuery = supabase
      .from("payroll_periods")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentCompanyId) {
      periodQuery = periodQuery.eq("company_id", currentCompanyId);
    }

    const { data: periodRows, error: periodError } = await periodQuery;

    if (periodError) {
      console.log("GET PAYROLL PERIODS FOR PAYSLIPS ERROR:", periodError.message);
      setPeriods([]);
      setSelectedPeriodId("");
      return;
    }

    let recordQuery = supabase
      .from("payroll_records")
      .select("period_id, record_status, release_status, status, paid_amount, remaining_amount, remaining_payroll_balance, released_at");

    if (currentCompanyId) {
      recordQuery = recordQuery.eq("company_id", currentCompanyId);
    }

    const { data: releasedRecords, error: recordError } = await recordQuery;

    if (recordError) {
      console.log("GET PAYSLIP RECORD PERIOD INDEX ERROR:", recordError.message);
      setPeriods([]);
      setSelectedPeriodId("");
      return;
    }

    const validPeriodIds = new Set(
      (releasedRecords || [])
        .filter((record: any) => {
          const recordStatus = String(record.record_status || "").toUpperCase();
          const releaseStatus = String(record.release_status || "").toUpperCase();
          const status = String(record.status || "").toUpperCase();
          const paidAmount = Number(record.paid_amount || 0);
          const remainingAmount = Number(record.remaining_amount ?? record.remaining_payroll_balance ?? 0);

          return (
            recordStatus === "RELEASED" ||
            releaseStatus === "RELEASED" ||
            status === "RELEASED" ||
            recordStatus === "LOCKED" && releaseStatus.includes("PARTIAL") ||
            paidAmount > 0 ||
            remainingAmount > 0 && releaseStatus.includes("PARTIAL")
          );
        })
        .map((record: any) => String(record.period_id || ""))
        .filter(Boolean),
    );

    const mappedPeriods = (periodRows || [])
      .filter((period: any) => validPeriodIds.has(String(period.id)))
      .map((period: any) => ({
        ...period,
        status: "RELEASED / PARTIAL",
      }));

    setPeriods(mappedPeriods);

    const selectedStillExists = mappedPeriods.some(
      (period) => String(period.id) === String(selectedPeriodId),
    );

    if ((!selectedPeriodId || !selectedStillExists) && mappedPeriods.length > 0) {
      setSelectedPeriodId(mappedPeriods[0].id);
    }

    if (mappedPeriods.length === 0) {
      setSelectedPeriodId("");
    }
  };

  const getRecords = async (periodId: string) => {
    if (!periodId) {
      setRecords([]);
      setAdjustments([]);
      return;
    }

    const currentCompanyId = getCurrentCompanyId();

    let recordQuery = supabase
      .from("payroll_records")
      .select("*")
      .eq("period_id", periodId)
      .order("employee_name", { ascending: true });

    if (currentCompanyId) {
      recordQuery = recordQuery.eq("company_id", currentCompanyId);
    }

    const [
      recordsResult,
      employeesResult,
      periodResult,
      adjustmentsResult,
    ] = await Promise.all([
      recordQuery,
      supabase.from("employees").select("*"),
      supabase.from("payroll_periods").select("*").eq("id", periodId).maybeSingle(),
      supabase.from("payroll_adjustments").select("*").eq("period_id", periodId),
    ]);

    if (recordsResult.error) {
      console.log("GET PAYROLL RECORDS FOR PAYSLIPS ERROR:", recordsResult.error.message);
      setRecords([]);
      setAdjustments(adjustmentsResult.data || []);
      return;
    }

    if (employeesResult.error) {
      console.log("GET EMPLOYEES FOR PAYSLIPS ERROR:", employeesResult.error.message);
    }

    if (adjustmentsResult.error) {
      console.log("GET ADJUSTMENTS FOR PAYSLIPS ERROR:", adjustmentsResult.error.message);
    }

    const employeesById = mapEmployees(employeesResult.data || []);
    const selectedPeriodRow = periodResult.data || periods.find((period) => period.id === periodId) || {};

    const periodLabel =
      selectedPeriodRow.period_name ||
      selectedPeriodRow.period_label ||
      selectedPeriodRow.payroll_period ||
      "Payroll Period";

    const mappedRecords = (recordsResult.data || [])
      .filter((record: any) => {
        const recordStatus = String(record.record_status || "").toUpperCase();
        const releaseStatus = String(record.release_status || "").toUpperCase();
        const status = String(record.status || "").toUpperCase();
        const paidAmount = Number(record.paid_amount || record.released_amount || 0);
        const remainingAmount = Number(record.remaining_amount ?? record.remaining_payroll_balance ?? 0);

        return (
          recordStatus === "RELEASED" ||
          releaseStatus === "RELEASED" ||
          status === "RELEASED" ||
          releaseStatus.includes("PARTIAL") ||
          paidAmount > 0 ||
          remainingAmount > 0 && releaseStatus.includes("PARTIAL")
        );
      })
      .map((record: any) => {
        const employee = record.employee_id
          ? employeesById.get(String(record.employee_id)) || {}
          : {};

        const netPay = Number(record.net_pay ?? record.net_amount ?? record.release_amount ?? 0);
        const paidAmount = Number(record.paid_amount || record.released_amount || 0);
        const remainingAmount = Number(
          record.remaining_amount ?? record.remaining_payroll_balance ?? Math.max(netPay - paidAmount, 0),
        );

        const isFullReleased =
          String(record.record_status || "").toUpperCase() === "RELEASED" ||
          String(record.release_status || "").toUpperCase() === "RELEASED" ||
          String(record.status || "").toUpperCase() === "RELEASED";

        const isPartial =
          String(record.release_status || "").toUpperCase().includes("PARTIAL") ||
          (paidAmount > 0 && remainingAmount > 0) ||
          (String(record.status || "").toUpperCase().includes("PARTIAL"));

        return {
          ...record,
          id: record.id,
          payroll_record_id: record.id,
          source_table: "payroll_records",
          company_id: record.company_id || currentCompanyId,
          period_id: record.period_id || periodId,
          period_label: periodLabel,
          payroll_period: periodLabel,

          employee_id: record.employee_id || null,
          employee_no: employee.employee_no || record.employee_no || "",
          employee_name: record.employee_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unknown Employee",
          employee_email: employee.email || record.email || record.employee_email || "",
          email: employee.email || record.email || record.employee_email || "",

          department: record.department || employee.department || "",
          position: record.position || employee.position || "",

          gross_pay: Number(record.gross_pay ?? record.gross_amount ?? 0),
          deductions: Number(record.total_deductions ?? record.deductions ?? record.total_deduction ?? 0),
          total_deductions: Number(record.total_deductions ?? record.deductions ?? record.total_deduction ?? 0),
          net_pay: netPay,
          released_amount: isFullReleased ? netPay : paidAmount,
          release_amount: isFullReleased ? netPay : paidAmount,
          remaining_amount: isFullReleased ? 0 : remainingAmount,
          remaining_payroll_balance: isFullReleased ? 0 : remainingAmount,

          status: isFullReleased ? "RELEASED" : isPartial ? "PARTIALLY RELEASED" : record.status,
          release_status: isFullReleased ? "RELEASED" : isPartial ? "PARTIALLY RELEASED" : record.release_status,
          payslip_status: isFullReleased ? "Released" : isPartial ? "Partial" : record.payslip_status || "Released",
          payslip_email_status: record.payslip_email_status || "Not Sent",

          released_at: record.released_at || record.last_release_at || record.updated_at || record.created_at,
          released_by: record.released_by || record.last_release_by || "Payroll Manager",
          release_no: record.reference_no || "",
          snapshot_no: "",
        };
      });

    setRecords(mappedRecords);
    setAdjustments(adjustmentsResult.data || []);
  };

  /// FUNCTIONS
  const updateLocalPayslipStatus = (
    recordId: string,
    status: string,
    emailStatus: string,
  ) => {
    setRecords((prev) =>
      prev.map((record) =>
        String(record.id) === String(recordId)
          ? {
              ...record,
              payslip_status: status,
              payslip_email_status: emailStatus,
              payslip_released_at: new Date().toISOString(),
            }
          : record,
      ),
    );

    setActivePayslip((prev: any) =>
      prev && String(prev.id) === String(recordId)
        ? {
            ...prev,
            payslip_status: status,
            payslip_email_status: emailStatus,
            payslip_released_at: new Date().toISOString(),
          }
        : prev,
    );
  };

  const sendPayslip = async (record: any) => {
    const employeeEmail = getEmail(record);

    if (!employeeEmail) {
      alert("Employee has no email address.");
      return;
    }

    if (!isPayrollReleased(record) && !isPayrollPartial(record)) {
      alert("Payroll must be released or partially released before sending the payslip.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/payroll/send-payslip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeEmail,
          period: selectedPeriod,
          record: {
            ...record,
            total_deductions: getDisplayedTotalDeductions(record),
            net_pay: getDisplayedNetPay(record),
            released_amount: getReleasedAmount(record),
            source_table: "released_payroll_items",
          },
          adjustments: adjustments.filter(
            (item) => String(item.employee_id) === String(record.employee_id),
          ),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        updateLocalPayslipStatus(record.id, "Released", "Failed");
        alert(result.error || "Failed to send payslip.");
        return;
      }

      updateLocalPayslipStatus(record.id, "Released", "Sent");
      alert("Payslip sent successfully.");
    } catch (error) {
      console.log("SEND PAYSLIP ERROR:", error);
      updateLocalPayslipStatus(record.id, "Released", "Failed");
      alert("Failed to send payslip.");
    } finally {
      setIsSending(false);
    }
  };

  const markReleased = async (record: any) => {
    if (!isPayrollReleased(record) && !isPayrollPartial(record)) {
      alert("Payroll must be released or partially released before marking payslip.");
      return;
    }

    updateLocalPayslipStatus(record.id, "Released", record.payslip_email_status || "Not Sent");
  };

  const printCleanPayslip = () => {
    const printContents = document.getElementById("clean-payslip-document")?.innerHTML;

    if (!printContents) {
      alert("Payslip content is not ready.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      alert("Print window was blocked. Please allow pop-ups for this site.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>OPSCORE Payslip</title>
          <style>
            @page { size: A4 portrait; margin: 7mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: white;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9.2px;
              line-height: 1.14;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .opscore-payslip {
              width: 100%;
              max-width: 196mm;
              margin: 0 auto;
              border: 1px solid #0f172a;
              background: white;
              page-break-inside: avoid;
            }
            .ps-header {
              display: grid;
              grid-template-columns: 1fr 138px;
              gap: 10px;
              padding: 7px 10px 5px;
              border-bottom: 2px solid #0f172a;
            }
            .ps-company { margin: 0; font-size: 19px; font-weight: 900; letter-spacing: .4px; text-transform: uppercase; }
            .ps-title { margin: 2px 0 0; font-size: 9.5px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #334155; }
            .ps-subtitle { margin: 4px 0 0; font-size: 9px; color: #475569; font-weight: 700; }
            .ps-stamp { border: 1px solid #0f172a; padding: 5px 7px; text-align: right; }
            .ps-stamp-label { font-size: 7.5px; font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase; color: #64748b; }
            .ps-stamp-value { margin-top: 1px; font-size: 12px; font-weight: 900; color: #0f172a; }
            .ps-body { padding: 7px 10px 9px; }
            .ps-block-title { margin: 5px 0 2px; padding: 3px 5px; border: 1px solid #cbd5e1; background: #f1f5f9; font-size: 8.5px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; color: #334155; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 3px 4px; vertical-align: top; }
            th { background: #f8fafc; color: #475569; font-size: 7.4px; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase; text-align: left; }
            td { color: #0f172a; font-weight: 700; }
            .ps-label { color: #64748b; font-size: 7.4px; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase; }
            .ps-value { margin-top: 1px; color: #0f172a; font-size: 9.4px; font-weight: 900; }
            .amount { text-align: right; white-space: nowrap; font-weight: 900; }
            .muted { color: #64748b; font-weight: 700; }
            .ps-computation { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
            .ps-total-row td { border-top: 2px solid #0f172a; font-weight: 900; background: #f8fafc; }
            .ps-net-band { margin: 6px 0; display: grid; grid-template-columns: 1fr 190px; border: 2px solid #0f172a; }
            .ps-net-copy { padding: 5px 8px; }
            .ps-net-label { font-size: 8.8px; font-weight: 900; letter-spacing: 2.4px; text-transform: uppercase; color: #334155; }
            .ps-net-note { margin-top: 2px; color: #64748b; font-size: 8px; font-weight: 700; }
            .ps-net-amount { display: flex; align-items: center; justify-content: flex-end; padding: 5px 8px; border-left: 2px solid #0f172a; font-size: 21px; font-weight: 900; }
            .ps-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 10px; }
            .ps-signature { border-top: 1.5px solid #0f172a; padding-top: 3px; text-align: center; font-size: 8px; font-weight: 900; color: #334155; }
            .ps-note { margin-top: 6px; border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px 6px; color: #475569; font-size: 8px; font-weight: 700; }
            .ps-footer { display: none; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  /// EFFECTS
  useEffect(() => {
    getPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      getRecords(selectedPeriodId);
    } else {
      setRecords([]);
      setAdjustments([]);
    }
  }, [selectedPeriodId]);

  /// CALCULATIONS
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position} ${record.employee_no} ${getEmail(record)}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }, [records, searchTerm]);

  const sentCount = records.filter((record) => record.payslip_email_status === "Sent").length;
  const failedCount = records.filter((record) => record.payslip_email_status === "Failed").length;
  const releasedCount = records.filter((record) => isPayrollReleased(record)).length;
  const payrollReleasedCount = records.filter((record) => isPayrollReleased(record)).length;
  const pendingReleaseCount = Math.max(records.length - payrollReleasedCount, 0);

  const totalNet = records.reduce((sum, record) => sum + getDisplayedNetPay(record), 0);
  const totalReleased = records.reduce((sum, record) => sum + getReleasedAmount(record), 0);

  const getApprovedAdjustmentsForRecord = (record: any) =>
    adjustments.filter(
      (item) =>
        String(item.employee_id) === String(record.employee_id) &&
        String(item.status || "").toLowerCase() === "approved",
    );

  const assistantReminders = [
    ...(failedCount > 0
      ? [{ type: "Critical", tone: "critical", text: `${failedCount} payslip email failed. Review employee email addresses.` }]
      : []),
    ...(records.some((record) => !getEmail(record))
      ? [{ type: "Warning", tone: "warning", text: "Some released payroll items have no employee email address for payslip delivery." }]
      : []),
    ...(records.length > 0
      ? [{ type: "Information", tone: "info", text: `${records.length} released payslip record(s) loaded for ${getPeriodLabel(selectedPeriod)}.` }]
      : [{ type: "Information", tone: "info", text: "Only released payroll appears here. Select a released payroll period to continue." }]),
  ].slice(0, 5);

  /// UI
  return (
    <PageGuard moduleKey="payslips">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="PAYROLL / PAYSLIPS" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Payroll Operations</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Payslip Management</h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Payslips are generated from Payroll Manager released and partially released records. Draft, open, registered, and unreleased locked rows do not appear here.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:min-w-[420px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Document Status</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Released Items</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{records.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Sent</p>
                    <p className="mt-1 text-xl font-black text-emerald-700">{sentCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Released</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{releasedCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Email Failed</p>
                    <p className={failedCount > 0 ? "mt-1 text-xl font-black text-red-700" : "mt-1 text-xl font-black text-slate-950"}>{failedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)_280px] lg:items-center">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Select released payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {getPeriodLabel(period)} ({period.status || "RELEASED"})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee, department, position, employee no., or email..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Total Released</p>
                <p className="text-lg font-black text-slate-950">{formatMoney(totalReleased || totalNet)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Payslip Records</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Released and partially released payroll records ready for print, PDF save, and employee email.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Sent {sentCount}</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Released {releasedCount}</span>
                {failedCount > 0 && <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Failed {failedCount}</span>}
              </div>
            </div>

            <div className="overflow-auto p-6 pt-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-right">Net Pay</th>
                    <th className="px-4 py-3 text-right">Released</th>
                    <th className="px-4 py-3">Payroll</th>
                    <th className="px-4 py-3">Payslip</th>
                    <th className="px-4 py-3">Email Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredRecords.map((record) => {
                    const email = getEmail(record);
                    const payrollReleased = isPayrollReleased(record);

                    return (
                      <tr key={record.id} className="transition-all duration-200 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">{record.employee_name}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {record.employee_no || "No employee no."} • {record.department || "No department"} • {record.position || "No position"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          {email ? <span className="text-slate-700">{email}</span> : <StatusBadge value="No Email" />}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-emerald-700">{formatMoney(getDisplayedNetPay(record))}</td>
                        <td className="px-4 py-4 text-right font-black text-slate-950">{formatMoney(getReleasedAmount(record))}</td>
                        <td className="px-4 py-4"><StatusBadge value={payrollReleased ? "Released" : isPayrollPartial(record) ? "Partial" : "Pending Release"} /></td>
                        <td className="px-4 py-4"><StatusBadge value={record.payslip_status || "Released"} /></td>
                        <td className="px-4 py-4"><StatusBadge value={record.payslip_email_status || "Not Sent"} /></td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActivePayslip(record)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                              <Eye size={14} /> View
                            </button>

                            <button
                              onClick={() => sendPayslip(record)}
                              disabled={isSending || !email || (!payrollReleased && !isPayrollPartial(record))}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Mail size={14} /> Email
                            </button>

                            <button
                              onClick={() => markReleased(record)}
                              disabled={!payrollReleased && !isPayrollPartial(record)}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Mark
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center text-sm font-semibold text-slate-500">
                        No payslip records found. Payslips appear after full or partial Payroll Manager release.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {activePayslip && (
          <PayslipPreviewDrawer
            record={activePayslip}
            periodLabel={getRecordPeriodLabel(activePayslip)}
            approvedAdjustments={getApprovedAdjustmentsForRecord(activePayslip)}
            formatMoney={formatMoney}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
            getDisplayedTotalDeductions={getDisplayedTotalDeductions}
            getDisplayedNetPay={getDisplayedNetPay}
            getReleasedAmount={getReleasedAmount}
            getRemainingAmount={getRemainingAmount}
            getAutoDeductionTotal={getAutoDeductionTotal}
            getGovernmentDeductionTotal={getGovernmentDeductionTotal}
            getBalanceDeduction={getBalanceDeduction}
            isPayrollReleased={isPayrollReleased}
            isPayrollPartial={isPayrollPartial}
            onClose={() => setActivePayslip(null)}
            onPrint={printCleanPayslip}
          />
        )}

        <OpscoreAssistant reminders={assistantReminders} />
      </div>
    </PageGuard>
  );
}

function PayslipPreviewDrawer({
  record,
  periodLabel,
  approvedAdjustments,
  formatMoney,
  formatDate,
  formatDateTime,
  getDisplayedTotalDeductions,
  getDisplayedNetPay,
  getReleasedAmount,
  getRemainingAmount,
  getAutoDeductionTotal,
  getGovernmentDeductionTotal,
  getBalanceDeduction,
  isPayrollReleased,
  isPayrollPartial,
  onClose,
  onPrint,
}: any) {
  const grossPay = Number(record.gross_pay || 0);
  const totalDeductions = getDisplayedTotalDeductions(record);
  const netPay = getDisplayedNetPay(record);
  const releasedAmount = getReleasedAmount(record);
  const remainingAmount = getRemainingAmount(record);

  return (
    <>
      <div className="fixed left-0 right-0 top-16 z-40 h-[calc(100vh-64px)] bg-slate-950/35" onClick={onClose} />
      <aside className="fixed right-0 top-16 z-50 flex h-[calc(100vh-64px)] w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Official Payslip Preview</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{record.employee_name || "Employee Payslip"}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{periodLabel} • Print-safe A4 payroll document</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6">
          <div className="mx-auto w-full max-w-[760px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <CleanPayslipDocument
              record={record}
              periodLabel={periodLabel}
              approvedAdjustments={approvedAdjustments}
              grossPay={grossPay}
              totalDeductions={totalDeductions}
              netPay={netPay}
              releasedAmount={releasedAmount}
              remainingAmount={remainingAmount}
              formatMoney={formatMoney}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              getAutoDeductionTotal={getAutoDeductionTotal}
              getGovernmentDeductionTotal={getGovernmentDeductionTotal}
              getBalanceDeduction={getBalanceDeduction}
              isPayrollReleased={isPayrollReleased}
              isPayrollPartial={isPayrollPartial}
            />
          </div>

          <div id="clean-payslip-document" className="hidden">
            <CleanPayslipDocument
              record={record}
              periodLabel={periodLabel}
              approvedAdjustments={approvedAdjustments}
              grossPay={grossPay}
              totalDeductions={totalDeductions}
              netPay={netPay}
              releasedAmount={releasedAmount}
              remainingAmount={remainingAmount}
              formatMoney={formatMoney}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              getAutoDeductionTotal={getAutoDeductionTotal}
              getGovernmentDeductionTotal={getGovernmentDeductionTotal}
              getBalanceDeduction={getBalanceDeduction}
              isPayrollReleased={isPayrollReleased}
              isPayrollPartial={isPayrollPartial}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white/95 p-6">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            Close
          </button>
          <button
            onClick={onPrint}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </aside>
    </>
  );
}

function CleanPayslipDocument({
  record,
  periodLabel,
  approvedAdjustments,
  grossPay,
  totalDeductions,
  netPay,
  releasedAmount,
  remainingAmount,
  formatMoney,
  formatDateTime,
  getAutoDeductionTotal,
  getGovernmentDeductionTotal,
  getBalanceDeduction,
  isPayrollReleased,
  isPayrollPartial,
}: any) {
  const payslipNumber = `PS-${String(record.id || "00000000").slice(0, 8).toUpperCase()}`;
  const manualDeduction = Number(record.manual_deduction || 0);
  const autoDeduction = getAutoDeductionTotal(record);
  const governmentDeduction = getGovernmentDeductionTotal(record);
  const balanceDeduction = getBalanceDeduction(record);
  const otherDeduction = Math.max(totalDeductions - autoDeduction - manualDeduction - governmentDeduction - balanceDeduction, 0);

  return (
    <div className="opscore-payslip overflow-hidden border border-slate-950 bg-white text-slate-950">
      <div className="ps-header grid grid-cols-1 gap-4 border-b-2 border-slate-950 p-3 md:grid-cols-[minmax(0,1fr)_150px]">
        <div>
          <h1 className="ps-company text-xl font-black uppercase tracking-wide text-slate-950">Vincent Resort Hotel</h1>
          <p className="ps-title mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Employee Payslip</p>
          <p className="ps-subtitle mt-2 text-sm font-semibold text-slate-600">
            Payroll Period: <span className="font-black text-slate-950">{periodLabel}</span>
          </p>
        </div>

        <div className="ps-stamp border border-slate-950 p-2 text-right">
          <p className="ps-stamp-label text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Payroll Status</p>
          <p className="ps-stamp-value mt-1 text-base font-black text-slate-950">{isPayrollReleased(record) ? "RELEASED" : isPayrollPartial(record) ? "PARTIAL" : "PENDING"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{payslipNumber}</p>
        </div>
      </div>

      <div className="ps-body p-3">
        <SectionTitle title="Employee Information" />
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr>
              <InfoCell label="Employee Name" value={record.employee_name || "-"} />
              <InfoCell label="Employee No." value={record.employee_no || "-"} />
              <InfoCell label="Department" value={record.department || "-"} />
              <InfoCell label="Position" value={record.position || "-"} />
              <InfoCell label="Rate Type" value={record.rate_type || "-"} />
              <InfoCell label="Period" value={periodLabel} />
            </tr>
          </tbody>
        </table>

        <SectionTitle title="Attendance Summary" />
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr>
              <MetricCell label="Scheduled" value={Number(record.scheduled_days || 0)} />
              <MetricCell label="Worked" value={Number(record.days_worked || record.regular_days || 0)} />
              <MetricCell label="Rest / Off" value={Number(record.rest_days || 0)} />
              <MetricCell label="Absent" value={Number(record.absent_days || 0)} />
              <MetricCell label="Late" value={`${Number(record.late_minutes || 0)} min`} />
              <MetricCell label="Undertime" value={`${Number(record.undertime_minutes || 0)} min`} />
            </tr>
          </tbody>
        </table>

        <SectionTitle title="Payroll Computation" />
        <div className="ps-computation grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Earnings</th>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                <MoneyRow label="Basic Pay" value={record.basic_pay || record.gross_pay} formatMoney={formatMoney} />
                <MoneyRow label="Overtime Pay" value={record.ot_pay || record.overtime_pay} formatMoney={formatMoney} />
                <MoneyRow label="Holiday Pay" value={record.holiday_pay} formatMoney={formatMoney} />
                <MoneyRow label="Allowance / Bonus" value={record.allowance || record.allowances || record.bonus || record.incentive} formatMoney={formatMoney} />
                <MoneyRow label="Gross Pay" value={grossPay} formatMoney={formatMoney} bold />
              </tbody>
            </table>
          </div>

          <div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Deductions</th>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                <MoneyRow label="Late Deduction" value={record.late_deduction} formatMoney={formatMoney} />
                <MoneyRow label="Undertime Deduction" value={record.undertime_deduction} formatMoney={formatMoney} />
                <MoneyRow label="Absent Deduction" value={record.absent_deduction} formatMoney={formatMoney} />
                <MoneyRow label="Cash Advance / Balance" value={balanceDeduction} formatMoney={formatMoney} />
                <MoneyRow label="Manual Deduction" value={manualDeduction} formatMoney={formatMoney} />
                <MoneyRow label="Government Deductions" value={governmentDeduction} formatMoney={formatMoney} />
                {otherDeduction > 0 && <MoneyRow label="Other Deductions" value={otherDeduction} formatMoney={formatMoney} />}
                <MoneyRow label="Total Deductions" value={totalDeductions} formatMoney={formatMoney} bold />
              </tbody>
            </table>
          </div>
        </div>

        <div className="ps-net-band my-2 grid grid-cols-1 overflow-hidden border-2 border-slate-950 md:grid-cols-[minmax(0,1fr)_190px]">
          <div className="ps-net-copy p-2">
            <p className="ps-net-label text-[11px] font-black uppercase tracking-[0.24em] text-slate-700">Released Amount</p>
            <p className="ps-net-note mt-0.5 text-[10px] font-semibold text-slate-500">Payslip is available only after Payroll Manager release.</p>
          </div>
          <div className="ps-net-amount flex items-center justify-end border-t-2 border-slate-950 p-2 text-2xl font-black text-slate-950 md:border-l-2 md:border-t-0">
            {formatMoney(releasedAmount)}
          </div>
        </div>

        <SectionTitle title="Release Information" />
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr>
              <MetricCell label="Gross Pay" value={formatMoney(grossPay)} />
              <MetricCell label="Deductions" value={formatMoney(totalDeductions)} />
              <MetricCell label="Net Pay" value={formatMoney(netPay)} />
              <MetricCell label="Released" value={formatMoney(releasedAmount)} />
              <MetricCell label="Remaining" value={formatMoney(remainingAmount)} />
              <MetricCell label="Released By" value={record.released_by || "Payroll/Admin"} />
            </tr>
          </tbody>
        </table>

        {approvedAdjustments.length > 0 ? (
          <>
            <SectionTitle title="Approved Adjustments" />
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Type</th>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Description</th>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-right text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Amount</th>
                  <th className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {approvedAdjustments.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-2 py-1.5 font-bold">{item.adjustment_type || item.type || item.category || "Adjustment"}</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-600">{item.description || item.remarks || "-"}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-black">{formatMoney(item.amount)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-bold">{item.status || "Approved"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="mt-2 border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600">
            Approved Adjustments: None
          </div>
        )}

        <div className="ps-note mt-2 border border-slate-300 bg-slate-50 p-2 text-[11px] font-semibold leading-4 text-slate-600">
          I acknowledge that I have reviewed this payslip and received the salary amount stated above, subject to company payroll records and approved deductions. Any dispute must be reported to Payroll/Admin before final filing.
        </div>

        <div className="ps-signatures mt-4 grid grid-cols-3 gap-4">
          <div className="ps-signature border-t border-slate-950 pt-1.5 text-center text-[11px] font-black text-slate-700">Employee Signature</div>
          <div className="ps-signature border-t border-slate-950 pt-1.5 text-center text-[11px] font-black text-slate-700">Date Received</div>
          <div className="ps-signature border-t border-slate-950 pt-1.5 text-center text-[11px] font-black text-slate-700">Payroll / Admin Signature</div>
        </div>

        <div className="ps-footer hidden">
          Generated by OPSCORE Payroll • {formatDateTime(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: any) {
  return (
    <p className="ps-block-title mt-2 border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
      {title}
    </p>
  );
}

function InfoCell({ label, value }: any) {
  return (
    <td className="border border-slate-300 px-2 py-1.5">
      <p className="ps-label text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="ps-value mt-0.5 font-black text-slate-950">{value}</p>
    </td>
  );
}

function MetricCell({ label, value }: any) {
  return (
    <td className="border border-slate-300 px-2 py-1.5 text-center">
      <p className="ps-label text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="ps-value mt-0.5 font-black text-slate-950">{value}</p>
    </td>
  );
}

function MoneyRow({ label, value, formatMoney, bold }: any) {
  return (
    <tr className={bold ? "ps-total-row" : ""}>
      <td className={bold ? "border border-slate-300 bg-slate-50 px-2 py-2 font-black text-slate-950" : "border border-slate-300 px-2 py-2 font-semibold text-slate-700"}>{label}</td>
      <td className="amount border border-slate-300 px-2 py-1.5 text-right font-black text-slate-950">{formatMoney(value)}</td>
    </tr>
  );
}

function StatusBadge({ value }: any) {
  const normalized = String(value || "");
  const color =
    ["Released", "Sent", "Paid", "Active", "Approved", "RELEASED"].includes(normalized)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : ["Failed", "Rejected", "No Email"].includes(normalized)
        ? "border-red-200 bg-red-50 text-red-700"
        : ["Not Released", "Not Sent", "Pending Release", "Pending", "Partial"].includes(normalized)
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${color}`}>
      {normalized}
    </span>
  );
}
