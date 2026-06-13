"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Mail, Printer, Search, Send, X } from "lucide-react";
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

  const getPeriodLabel = (period: any) =>
    period?.period_name || period?.period_label || period?.payroll_period || "Payroll Period";

  const getRecordPeriodLabel = (record: any) =>
    record.period_label || record.period_name || record.payroll_period || getPeriodLabel(selectedPeriod);

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
    Number(record.balance_deduction || record.cash_advance_deduction || record.ca_deduction || 0);

  const getDisplayedTotalDeductions = (record: any) => {
    const rebuiltTotal =
      getAutoDeductionTotal(record) +
      Number(record.manual_deduction || 0) +
      getBalanceDeduction(record) +
      getGovernmentDeductionTotal(record);

    const savedTotal = Number(record.total_deductions || 0);
    return Math.max(savedTotal, rebuiltTotal);
  };

  const getDisplayedNetPay = (record: any) =>
    Number(record.gross_pay || 0) - getDisplayedTotalDeductions(record);

  const getReleasedAmount = (record: any) =>
    Number(record.paid_amount || record.amount_released || record.release_amount || getDisplayedNetPay(record) || 0);

  const getRemainingAmount = (record: any) =>
    Math.max(getDisplayedNetPay(record) - getReleasedAmount(record), 0);

  const isPayrollReleased = (record: any) => {
    const status = String(record.status || "");
    const releaseStatus = String(record.release_status || "");
    return status === "Released" || status === "Paid" || releaseStatus === "Released" || releaseStatus === "Paid";
  };

  const getEmail = (record: any) => record.employees?.email || record.email || "";

  /// DATA LOADERS
  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return console.log("GET PERIODS ERROR:", error.message);
    setPeriods(data || []);
  };

  const getRecords = async (periodId: string) => {
    const { data, error } = await supabase
      .from("payroll_records")
      .select("*, employees(email)")
      .eq("period_id", periodId)
      .order("department", { ascending: true })
      .order("employee_name", { ascending: true });

    if (error) return console.log("GET RECORDS ERROR:", error.message);
    setRecords(data || []);
  };

  const getAdjustments = async (periodId: string) => {
    const { data, error } = await supabase
      .from("payroll_adjustments")
      .select("*")
      .eq("period_id", periodId);

    if (error) return console.log("GET ADJUSTMENTS ERROR:", error.message);
    setAdjustments(data || []);
  };

  /// FUNCTIONS
  const updatePayslipStatus = async (recordId: string, status: string, emailStatus: string) => {
    const { error } = await supabase
      .from("payroll_records")
      .update({
        payslip_status: status,
        payslip_email_status: emailStatus,
        payslip_released_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) {
      alert("Failed to update payslip status.");
      console.log("UPDATE PAYSLIP STATUS ERROR:", error.message);
      return;
    }

    if (selectedPeriodId) await getRecords(selectedPeriodId);
  };

  const sendPayslip = async (record: any) => {
    const employeeEmail = getEmail(record);

    if (!employeeEmail) {
      alert("Employee has no email address.");
      return;
    }

    if (!isPayrollReleased(record)) {
      alert("Payroll must be released before sending the payslip.");
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
          },
          adjustments: adjustments.filter((item) => item.employee_id === record.employee_id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await updatePayslipStatus(record.id, "Not Released", "Failed");
        alert(result.error || "Failed to send payslip.");
        return;
      }

      await updatePayslipStatus(record.id, "Released", "Sent");
      alert("Payslip sent successfully.");
    } catch (error) {
      console.log("SEND PAYSLIP ERROR:", error);
      await updatePayslipStatus(record.id, "Not Released", "Failed");
      alert("Failed to send payslip.");
    } finally {
      setIsSending(false);
    }
  };

  const markReleased = async (record: any) => {
    if (!isPayrollReleased(record)) {
      alert("Payroll must be released before releasing payslip.");
      return;
    }

    await updatePayslipStatus(record.id, "Released", record.payslip_email_status || "Not Sent");
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
            .ps-footer { display: none; }          </style>
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
      getAdjustments(selectedPeriodId);
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
  const releasedCount = records.filter((record) => record.payslip_status === "Released").length;
  const payrollReleasedCount = records.filter((record) => isPayrollReleased(record)).length;
  const pendingReleaseCount = Math.max(records.length - releasedCount, 0);

  const totalNet = records.reduce((sum, record) => sum + getDisplayedNetPay(record), 0);
  const totalReleased = records.reduce((sum, record) => sum + getReleasedAmount(record), 0);

  const getApprovedAdjustmentsForRecord = (record: any) =>
    adjustments.filter(
      (item) =>
        item.employee_id === record.employee_id &&
        String(item.status || "").toLowerCase() === "approved",
    );

  const assistantReminders = [
    ...(failedCount > 0
      ? [{ type: "Critical", tone: "critical", text: `${failedCount} payslip email failed. Review employee email addresses.` }]
      : []),
    ...(pendingReleaseCount > 0
      ? [{ type: "Warning", tone: "warning", text: `${pendingReleaseCount} payslip(s) are not yet marked released.` }]
      : []),
    ...(records.some((record) => !getEmail(record))
      ? [{ type: "Warning", tone: "warning", text: "Some employees have no email address for payslip delivery." }]
      : []),
    ...(records.length > 0
      ? [{ type: "Information", tone: "info", text: `${records.length} payroll record(s) loaded for ${getPeriodLabel(selectedPeriod)}.` }]
      : [{ type: "Information", tone: "info", text: "Select a payroll period to generate payslip records." }]),
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
                  Generate professional A4 payroll payslips, release employee copies, email approved documents, and maintain document delivery status.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:min-w-[420px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Document Status</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Records</p>
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
                    <p className="text-xs font-semibold text-slate-500">Pending</p>
                    <p className={pendingReleaseCount > 0 ? "mt-1 text-xl font-black text-amber-700" : "mt-1 text-xl font-black text-slate-950"}>{pendingReleaseCount}</p>
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
                <option value="">Select payroll period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {getPeriodLabel(period)} ({period.status || "No status"})
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
                <p className="mt-1 text-sm font-medium text-slate-500">Released payroll records ready for print, PDF save, employee email, and payslip status tracking.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Sent {sentCount}</span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Pending {pendingReleaseCount}</span>
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
                        <td className="px-4 py-4"><StatusBadge value={payrollReleased ? "Released" : record.status || "Pending Release"} /></td>
                        <td className="px-4 py-4"><StatusBadge value={record.payslip_status || "Not Released"} /></td>
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
                              disabled={isSending || !email || !payrollReleased}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Mail size={14} /> Email
                            </button>

                            <button
                              onClick={() => markReleased(record)}
                              disabled={!payrollReleased}
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
                        No payslip records found. Select a payroll period to continue.
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
  formatDate,
  formatDateTime,
  getAutoDeductionTotal,
  getGovernmentDeductionTotal,
  getBalanceDeduction,
  isPayrollReleased,
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
          <p className="ps-stamp-value mt-1 text-base font-black text-slate-950">{isPayrollReleased(record) ? "RELEASED" : "PENDING"}</p>
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
              <MetricCell label="Worked" value={Number(record.days_worked || 0)} />
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
                <MoneyRow label="Basic Pay" value={record.basic_pay} formatMoney={formatMoney} />
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
            <p className="ps-net-label text-[11px] font-black uppercase tracking-[0.24em] text-slate-700">Net Pay</p>
            <p className="ps-net-note mt-0.5 text-[10px] font-semibold text-slate-500">Amount payable after approved earnings and deductions.</p>
          </div>
          <div className="ps-net-amount flex items-center justify-end border-t-2 border-slate-950 p-2 text-2xl font-black text-slate-950 md:border-l-2 md:border-t-0">
            {formatMoney(netPay)}
          </div>
        </div>

        <SectionTitle title="Release Information" />
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr>
              <MetricCell label="Gross Pay" value={formatMoney(grossPay)} />
              <MetricCell label="Deductions" value={formatMoney(totalDeductions)} />
              <MetricCell label="Released" value={formatMoney(releasedAmount)} />
              <MetricCell label="Remaining" value={formatMoney(remainingAmount)} />
              <MetricCell label="Status" value={record.payslip_status || "Not Released"} />
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

function KpiCard({ label, value, tone = "neutral" }: any) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-950";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ value }: any) {
  const normalized = String(value || "");
  const color =
    ["Released", "Sent", "Paid", "Active", "Approved"].includes(normalized)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : ["Failed", "Rejected", "No Email"].includes(normalized)
        ? "border-red-200 bg-red-50 text-red-700"
        : ["Not Released", "Not Sent", "Pending Release", "Pending"].includes(normalized)
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${color}`}>
      {normalized}
    </span>
  );
}
