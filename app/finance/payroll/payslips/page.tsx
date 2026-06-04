"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PayslipsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;


  const getGovernmentDeductionTotal = (record: any) =>
    Number(record.sss_deduction || 0) +
    Number(record.philhealth_deduction || 0) +
    Number(record.pagibig_deduction || 0) +
    Number(record.tax_deduction || 0);

  const getAutoDeductionTotal = (record: any) =>
    Number(record.late_deduction || 0) +
    Number(record.undertime_deduction || 0) +
    Number(record.absent_deduction || 0);

  const getDisplayedTotalDeductions = (record: any) => {
    const rebuiltTotal =
      getAutoDeductionTotal(record) +
      Number(record.manual_deduction || 0) +
      Number(record.balance_deduction || 0) +
      getGovernmentDeductionTotal(record);

    const savedTotal = Number(record.total_deductions || 0);
    return Math.max(savedTotal, rebuiltTotal);
  };

  const getDisplayedNetPay = (record: any) =>
    Number(record.gross_pay || 0) - getDisplayedTotalDeductions(record);

  const getPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("status", "Approved")
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

    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

    setIsSending(true);

    try {
      const response = await fetch("/api/payroll/send-payslip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        console.log("SEND PAYSLIP API ERROR:", result);
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
    await updatePayslipStatus(record.id, "Released", "Manual Release");
  };

  useEffect(() => {
    getPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      getRecords(selectedPeriodId);
      getAdjustments(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      `${record.employee_name} ${record.department} ${record.position}`
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

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Payroll
          </p>
          <h1 className="mt-2 text-4xl font-black">Payslip Center</h1>
          <p className="mt-2 max-w-5xl text-sm text-slate-400">
            Release approved payroll payslips, send email payslips, and track
            employee release status.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard title="Employees" value={records.length} />
          <SummaryCard
            title="Released"
            value={releasedCount}
            color="text-emerald-400"
          />
          <SummaryCard title="Email Sent" value={sentCount} color="text-blue-400" />
          <SummaryCard
            title="Pending"
            value={Math.max(records.length - releasedCount, 0)}
            color="text-amber-400"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
            >
              <option value="">Select approved payroll period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.period_name} ({period.status})
                </option>
              ))}
            </select>

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-black">Payslip Release List</h2>

          <div className="mt-4 max-h-[700px] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1350px] text-sm">
              <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3">Release Status</th>
                  <th className="px-4 py-3">Email Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const email = record.employees?.email || "";

                  return (
                    <tr key={record.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-black">{record.employee_name}</p>
                        <p className="text-xs text-slate-500">
                          {record.department} • {record.position}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {email ? (
                          <span className="text-slate-300">{email}</span>
                        ) : (
                          <span className="text-red-400">No email</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(record.gross_pay)}
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(getDisplayedTotalDeductions(record))}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        {formatMoney(getDisplayedNetPay(record))}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge value={record.payslip_status || "Not Released"} />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          value={record.payslip_email_status || "Not Sent"}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendPayslip(record)}
                            disabled={isSending || !email}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
                          >
                            Send Email
                          </button>

                          <button
                            onClick={() => markReleased(record)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500"
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
                    <td colSpan={8} className="px-4 py-14 text-center text-slate-500">
                      No payslip records. Select an approved payroll period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
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
    value === "Released" || value === "Sent"
      ? "bg-emerald-500/10 text-emerald-400"
      : value === "Failed"
      ? "bg-red-500/10 text-red-400"
      : "bg-amber-500/10 text-amber-400";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>
      {value}
    </span>
  );
}