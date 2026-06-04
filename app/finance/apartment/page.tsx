"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentDashboardPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getData = async () => {
    const { data: unitsData, error: unitsError } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (unitsError) {
      console.log("UNITS ERROR:", unitsError.message);
      return;
    }

    const { data: billsData, error: billsError } = await supabase
      .from("apartment_bills")
      .select("*")
      .order("due_date", { ascending: false });

    if (billsError) {
      console.log("BILLS ERROR:", billsError.message);
      return;
    }

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("apartment_payments")
      .select("*");

    if (paymentsError) {
      console.log("PAYMENTS ERROR:", paymentsError.message);
      setPayments([]);
    } else {
      setPayments(paymentsData || []);
    }

    setUnits(unitsData || []);
    setBills(billsData || []);
  };

  const getUnit = (unitId: string) =>
    units.find((unit) => String(unit.id) === String(unitId));

  const getBillPayments = (billId: string) =>
    payments.filter((payment) => String(payment.bill_id) === String(billId));

  const getTotalBill = (bill: any) =>
    Number(bill?.rent_amount || 0) +
    Number(bill?.electric_amount || 0) +
    Number(bill?.water_amount || 0) +
    Number(bill?.internet_amount || 0) +
    Number(bill?.other_amount || 0);

  const getTotalPaid = (bill: any) =>
    getBillPayments(bill?.id).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

  const getBalance = (bill: any) => getTotalBill(bill) - getTotalPaid(bill);

  const getBillStatus = (bill: any) => {
    if (!bill) return "NO BILL";

    const balance = getBalance(bill);
    const paid = getTotalPaid(bill);
    const today = new Date();
    const dueDate = new Date(`${bill.due_date}T00:00:00`);

    if (balance <= 0) return "PAID";
    if (paid > 0) return "PARTIAL";
    if (today > dueDate) return "OVERDUE";
    return "UNPAID";
  };

  const getStatusStyle = (status: string) => {
    if (status === "PAID") return "bg-emerald-500/10 text-emerald-400";
    if (status === "PARTIAL") return "bg-amber-500/10 text-amber-400";
    if (status === "OVERDUE") return "bg-red-500/10 text-red-400";
    if (status === "UNPAID") return "bg-orange-500/10 text-orange-400";
    return "bg-slate-700 text-slate-300";
  };

  const activeUnits = units.filter((unit) =>
    ["active", "occupied"].includes(String(unit.status || "").toLowerCase())
  );

  const occupiedUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied"
  );

  const unitMonitoring = useMemo(() => {
    return activeUnits.map((unit) => {
      const unitBills = bills
        .filter((bill) => String(bill.unit_id) === String(unit.id))
        .sort((a, b) =>
          String(b.due_date || "").localeCompare(String(a.due_date || ""))
        );

      const latestBill = unitBills[0] || null;

      const totalReceivable = unitBills.reduce(
        (sum, bill) => sum + getTotalBill(bill),
        0
      );

      const totalPaid = unitBills.reduce(
        (sum, bill) => sum + getTotalPaid(bill),
        0
      );

      const totalBalance = totalReceivable - totalPaid;
      const status = getBillStatus(latestBill);

      return {
        unit,
        latestBill,
        totalReceivable,
        totalPaid,
        totalBalance,
        status,
      };
    });
  }, [activeUnits, bills, payments]);

  const totalReceivable = unitMonitoring.reduce(
    (sum, row) => sum + row.totalReceivable,
    0
  );

  const totalCollected = unitMonitoring.reduce(
    (sum, row) => sum + row.totalPaid,
    0
  );

  const totalUnpaid = unitMonitoring.reduce(
    (sum, row) => sum + row.totalBalance,
    0
  );

  const overdueCount = unitMonitoring.filter(
    (row) => row.status === "OVERDUE"
  ).length;

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Apartment Module
          </p>

          <h1 className="mt-2 text-3xl font-bold">Apartment Dashboard</h1>

          <p className="mt-1 text-sm text-slate-400">
            Monitor active apartments, tenant balances, collections, and overdue accounts.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/finance/apartment/billing"
            className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:scale-[1.02] hover:border-blue-400 hover:bg-slate-800"
          >
            <h2 className="text-xl font-bold">Apartment Billing</h2>
            <p className="mt-2 text-sm text-slate-400">
              Create monthly bills for rent, electricity, water, internet, and other charges.
            </p>
            <p className="mt-5 text-sm font-semibold text-blue-400">
              Open Billing →
            </p>
          </Link>

          <Link
            href="/finance/apartment/payment"
            className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:scale-[1.02] hover:border-emerald-400 hover:bg-slate-800"
          >
            <h2 className="text-xl font-bold">Apartment Payments</h2>
            <p className="mt-2 text-sm text-slate-400">
              Record partial or full payments and review collection history.
            </p>
            <p className="mt-5 text-sm font-semibold text-emerald-400">
              Open Payments →
            </p>
          </Link>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Active Units" value={activeUnits.length} />
          <SummaryCard
            title="Occupied Units"
            value={occupiedUnits.length}
            color="text-emerald-400"
          />
          <SummaryCard
            title="Overdue Units"
            value={overdueCount}
            color="text-amber-400"
          />
          <SummaryCard title="Total Bills" value={bills.length} />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Receivable"
            value={formatMoney(totalReceivable)}
          />
          <SummaryCard
            title="Total Collected"
            value={formatMoney(totalCollected)}
            color="text-emerald-400"
          />
          <SummaryCard
            title="Total Unpaid"
            value={formatMoney(totalUnpaid)}
            color="text-red-400"
          />
          <SummaryCard
            title="Payments Recorded"
            value={payments.length}
            color="text-blue-400"
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">
            Active Apartment Monitoring
          </h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Bill</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {unitMonitoring.map((row) => (
                  <tr
                    key={row.unit.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-bold">
                      {row.unit.unit_name}
                    </td>
                    <td className="px-4 py-3">
                      {row.unit.tenant_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.latestBill?.bill_month || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(getTotalBill(row.latestBill))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatMoney(getTotalPaid(row.latestBill))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {formatMoney(getBalance(row.latestBill))}
                    </td>
                    <td className="px-4 py-3">
                      {row.latestBill?.due_date || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {unitMonitoring.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No active apartment units found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">All Apartment Bills</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Bill</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => {
                  const unit = getUnit(bill.unit_id);
                  const status = getBillStatus(bill);

                  return (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-bold">
                        {unit?.unit_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {unit?.tenant_name || "-"}
                      </td>
                      <td className="px-4 py-3">{bill.bill_month}</td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(getTotalBill(bill))}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(bill))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(getBalance(bill))}
                      </td>
                      <td className="px-4 py-3">{bill.due_date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {bills.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No apartment bills yet.
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
      <h2 className={`mt-3 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}