"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, Printer, Search, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import PageGuard from "@/components/PageGuard";

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
    return status === "Released" || status === "Paid" || releaseStatus === "Released";
  };

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
  const updatePayslipStatus = async (
    recordId: string,
    status: string,
    emailStatus: string
  ) => {
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
    const employeeEmail = record.employees?.email;

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
          adjustments: adjustments.filter(
            (item) => item.employee_id === record.employee_id
          ),
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
          <title>Payslip</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: white;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              line-height: 1.25;
            }
            .doc {
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .company-title { font-size: 21px; font-weight: 800; margin: 0; }
            .doc-title { font-size: 12px; letter-spacing: 2px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px; }
            .muted { color: #4b5563; }
            .badge-line { text-align: right; font-size: 10px; line-height: 1.5; }
            .section-title {
              margin: 10px 0 5px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #111827;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 5px 6px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; font-weight: 800; }
            .no-border td, .no-border th { border: 0; padding: 2px 0; }
            .label { color: #4b5563; font-size: 9px; text-transform: uppercase; letter-spacing: .7px; }
            .value { font-weight: 800; color: #111827; }
            .amount { text-align: right; white-space: nowrap; font-weight: 700; }
            .net-box {
              margin: 10px 0;
              border: 2px solid #111827;
              padding: 8px 10px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .net-label { font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
            .net-amount { font-size: 26px; font-weight: 900; }
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .summary-table td { font-size: 11px; }
            .note {
              margin-top: 8px;
              border: 1px solid #d1d5db;
              padding: 7px;
              font-size: 10px;
              color: #374151;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 14px;
              margin-top: 18px;
            }
            .signature-line {
              border-top: 1px solid #111827;
              text-align: center;
              padding-top: 5px;
              font-size: 10px;
              font-weight: 700;
            }
            .print-hidden { display: none !important; }
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
      `${record.employee_name} ${record.department} ${record.position} ${record.employee_no}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const sentCount = records.filter(
    (record) => record.payslip_email_status === "Sent"
  ).length;

  const releasedCount = records.filter(
    (record) => record.payslip_status === "Released"
  ).length;

  const payrollReleasedCount = records.filter((record) => isPayrollReleased(record)).length;

  const getApprovedAdjustmentsForRecord = (record: any) =>
    adjustments.filter(
      (item) =>
        item.employee_id === record.employee_id &&
        String(item.status || "").toLowerCase() === "approved"
    );

  /// UI
return (
  <PageGuard moduleKey="payslips">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
            Payroll
          </p>
          <h1 className="mt-2 text-4xl font-black">Payslip Management</h1>
          <p className="mt-2 max-w-5xl text-sm text-slate-400">
            Review released payroll records, generate official payslips, send employee copies, and monitor document release status.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <SummaryCard title="Employees" value={records.length} />
          <SummaryCard title="Payroll Released" value={payrollReleasedCount} color="text-emerald-400" />
          <SummaryCard title="Payslip Released" value={releasedCount} color="text-emerald-400" />
          <SummaryCard title="Email Sent" value={sentCount} color="text-blue-400" />
          <SummaryCard title="Pending Release" value={Math.max(records.length - releasedCount, 0)} color="text-blue-300" />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
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
                placeholder="Search employee..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-10 py-3 text-sm outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-black">Payslip Records</h2>

          <div className="mt-4 max-h-[700px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1450px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-right">Released</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Payroll</th>
                  <th className="px-4 py-3">Payslip</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const email = record.employees?.email || "";
                  const payrollReleased = isPayrollReleased(record);

                  return (
                    <tr key={record.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-black">{record.employee_name}</p>
                        <p className="text-xs text-slate-500">
                          {record.employee_no || "No employee no."} • {record.department} • {record.position}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {email ? <span className="text-slate-300">{email}</span> : <span className="text-red-400">No email</span>}
                      </td>

                      <td className="px-4 py-3 text-right">{formatMoney(record.gross_pay)}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatMoney(getDisplayedTotalDeductions(record))}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">{formatMoney(getDisplayedNetPay(record))}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-300">{formatMoney(getReleasedAmount(record))}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-300">{formatMoney(getRemainingAmount(record))}</td>

                      <td className="px-4 py-3"><StatusBadge value={payrollReleased ? "Released" : record.status || "Pending Release"} /></td>
                      <td className="px-4 py-3"><StatusBadge value={record.payslip_status || "Not Released"} /></td>
                      <td className="px-4 py-3"><StatusBadge value={record.payslip_email_status || "Not Sent"} /></td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setActivePayslip(record)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-800"
                          >
                            <Eye size={14} /> View
                          </button>

                          <button
                            onClick={() => sendPayslip(record)}
                            disabled={isSending || !email || !payrollReleased}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
                          >
                            <Mail size={14} /> Email
                          </button>

                          <button
                            onClick={() => markReleased(record)}
                            disabled={!payrollReleased}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Mark Released
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center text-slate-500">
                      No payslip records. Select a payroll period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {activePayslip && (
        <PayslipPreviewModal
          record={activePayslip}
          selectedPeriod={selectedPeriod}
          periodLabel={getRecordPeriodLabel(activePayslip)}
          approvedAdjustments={getApprovedAdjustmentsForRecord(activePayslip)}
          formatMoney={formatMoney}
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
       </div>
  </PageGuard>
);
}

function PayslipPreviewModal({
  record,
  periodLabel,
  approvedAdjustments,
  formatMoney,
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
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[94vh] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <h2 className="text-2xl font-black">Payslip Preview</h2>
            <p className="mt-1 text-sm text-slate-400">
              Official payslip preview. Print output is optimized for A4 and excludes OPSCORE interface elements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500"
            >
              <Printer size={16} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-auto bg-slate-900 p-6">
          <div className="mx-auto max-w-[820px] bg-white p-8 text-slate-900 shadow-xl">
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
              formatDateTime={formatDateTime}
              getAutoDeductionTotal={getAutoDeductionTotal}
              getGovernmentDeductionTotal={getGovernmentDeductionTotal}
              getBalanceDeduction={getBalanceDeduction}
              isPayrollReleased={isPayrollReleased}
            />
          </div>
        </div>
      </div>
    </div>
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
}: any) {
  return (
    <div className="doc">
      <div className="header">
        <div>
          <p className="doc-title">Official Payroll Payslip</p>
          <h1 className="company-title">Vincent Resort Hotel</h1>
          <p className="muted">Payroll Period: {periodLabel}</p>
        </div>

        <div className="badge-line">
          <div><strong>Payslip No:</strong> {String(record.id || "").slice(0, 8).toUpperCase()}</div>
          <div><strong>Generated:</strong> {formatDateTime(new Date().toISOString())}</div>
          <div><strong>Payroll:</strong> {isPayrollReleased(record) ? "Released" : record.status || "Pending Release"}</div>
          <div><strong>Payslip:</strong> {record.payslip_status || "Not Released"}</div>
          <div><strong>Email:</strong> {record.payslip_email_status || "Not Sent"}</div>
        </div>
      </div>

      <table className="summary-table">
        <tbody>
          <tr>
            <td><div className="label">Employee</div><div className="value">{record.employee_name || "-"}</div></td>
            <td><div className="label">Employee No.</div><div className="value">{record.employee_no || "-"}</div></td>
            <td><div className="label">Department</div><div className="value">{record.department || "-"}</div></td>
            <td><div className="label">Position</div><div className="value">{record.position || "-"}</div></td>
          </tr>
          <tr>
            <td><div className="label">Rate Type</div><div className="value">{record.rate_type || "-"}</div></td>
            <td><div className="label">Basic Rate</div><div className="value">{formatMoney(record.basic_rate)}</div></td>
            <td><div className="label">Released At</div><div className="value">{formatDateTime(record.released_at)}</div></td>
            <td><div className="label">Payslip Released At</div><div className="value">{formatDateTime(record.payslip_released_at)}</div></td>
          </tr>
        </tbody>
      </table>

      <div className="net-box">
        <div>
          <div className="net-label">Net Pay</div>
          <div className="muted">Amount payable after approved deductions</div>
        </div>
        <div className="net-amount">{formatMoney(netPay)}</div>
      </div>

      <table className="summary-table">
        <tbody>
          <tr>
            <td><div className="label">Gross Pay</div><div className="value">{formatMoney(grossPay)}</div></td>
            <td><div className="label">Total Deductions</div><div className="value">{formatMoney(totalDeductions)}</div></td>
            <td><div className="label">Released Amount</div><div className="value">{formatMoney(releasedAmount)}</div></td>
            <td><div className="label">Remaining</div><div className="value">{formatMoney(remainingAmount)}</div></td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Work Summary</div>
      <table>
        <tbody>
          <tr>
            <td>Days Worked</td><td className="amount">{Number(record.days_worked || 0)}</td>
            <td>Scheduled Days</td><td className="amount">{Number(record.scheduled_days || 0)}</td>
            <td>Rest Days</td><td className="amount">{Number(record.rest_days || 0)}</td>
          </tr>
          <tr>
            <td>OT Minutes</td><td className="amount">{Number(record.ot_minutes || 0)}</td>
            <td>Late Minutes</td><td className="amount">{Number(record.late_minutes || 0)}</td>
            <td>Undertime Minutes</td><td className="amount">{Number(record.undertime_minutes || 0)}</td>
          </tr>
          <tr>
            <td>Absent Days</td><td className="amount">{Number(record.absent_days || 0)}</td>
            <td>Holiday Worked</td><td className="amount">{Array.isArray(record.holiday_worked_dates) ? record.holiday_worked_dates.length : 0}</td>
            <td></td><td></td>
          </tr>
        </tbody>
      </table>

      <div className="two-col">
        <div>
          <div className="section-title">Earnings</div>
          <table>
            <tbody>
              <MoneyRow label="Basic Pay" value={record.basic_pay} formatMoney={formatMoney} />
              <MoneyRow label="OT Pay" value={record.ot_pay || record.overtime_pay} formatMoney={formatMoney} />
              <MoneyRow label="Holiday Pay" value={record.holiday_pay} formatMoney={formatMoney} />
              <MoneyRow label="Allowance / Bonus" value={record.allowance || record.allowances || record.bonus || record.incentive} formatMoney={formatMoney} />
              <MoneyRow label="Gross Pay" value={grossPay} formatMoney={formatMoney} bold />
            </tbody>
          </table>
        </div>

        <div>
          <div className="section-title">Deductions</div>
          <table>
            <tbody>
              <MoneyRow label="Late Deduction" value={record.late_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Undertime Deduction" value={record.undertime_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Absent Deduction" value={record.absent_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Manual Deduction" value={record.manual_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Cash Advance / Balance" value={getBalanceDeduction(record)} formatMoney={formatMoney} />
              <MoneyRow label="SSS" value={record.sss_deduction} formatMoney={formatMoney} />
              <MoneyRow label="PhilHealth" value={record.philhealth_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Pag-IBIG" value={record.pagibig_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Tax" value={record.tax_deduction} formatMoney={formatMoney} />
              <MoneyRow label="Auto Deductions" value={getAutoDeductionTotal(record)} formatMoney={formatMoney} />
              <MoneyRow label="Government Deductions" value={getGovernmentDeductionTotal(record)} formatMoney={formatMoney} />
              <MoneyRow label="Total Deductions" value={totalDeductions} formatMoney={formatMoney} bold />
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">Approved Adjustments</div>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th className="amount">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {approvedAdjustments.length > 0 ? (
            approvedAdjustments.map((item: any) => (
              <tr key={item.id}>
                <td>{item.adjustment_type || item.type || item.category || "Adjustment"}</td>
                <td>{item.description || item.remarks || "-"}</td>
                <td className="amount">{formatMoney(item.amount)}</td>
                <td>{item.status || "Approved"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>
                No approved adjustments for this payslip.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="note">
        This payslip is system-generated from OPSCORE payroll records. For disputes, employee should contact Payroll/Admin before acknowledgement or final filing.
      </div>

      <div className="signature-grid">
        <div className="signature-line">Employee Signature</div>
        <div className="signature-line">Date Received</div>
        <div className="signature-line">Payroll/Admin Signature</div>
      </div>
    </div>
  );
}

function MoneyRow({ label, value, formatMoney, bold }: any) {
  return (
    <tr>
      <td style={{ fontWeight: bold ? 800 : 400 }}>{label}</td>
      <td className="amount" style={{ fontWeight: bold ? 800 : 700 }}>{formatMoney(value)}</td>
    </tr>
  );
}

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 text-2xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function StatusBadge({ value }: any) {
  const color =
    value === "Released" || value === "Sent" || value === "Paid"
      ? "bg-emerald-500/10 text-emerald-400"
      : value === "Failed" || value === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-amber-500/10 text-blue-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>
      {value}
    </span>
  );
}
