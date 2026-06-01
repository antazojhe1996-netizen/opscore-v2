"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentDashboardPage() {
  /// STATES
  const [bills, setBills] = useState<any[]>([]);

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getBills = async () => {
    const { data, error } = await supabase
      .from("apartment_bills")
      .select(`
        *,
        apartment_units (
          unit_name,
          tenant_name,
          status
        ),
        apartment_payments (
          amount
        )
      `)
      .order("due_date", { ascending: false });

    if (error) {
      console.log("GET APARTMENT DASHBOARD ERROR:", error);
      return;
    }

    setBills(data || []);
  };

  const getTotalBill = (bill: any) => {
    return (
      Number(bill.rent_amount || 0) +
      Number(bill.electric_amount || 0) +
      Number(bill.water_amount || 0) +
      Number(bill.internet_amount || 0) +
      Number(bill.other_amount || 0)
    );
  };

  const getTotalPaid = (bill: any) => {
    return (bill.apartment_payments || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0
    );
  };

  const getBalance = (bill: any) => {
    return getTotalBill(bill) - getTotalPaid(bill);
  };

  const getStatus = (bill: any) => {
    const balance = getBalance(bill);
    const paid = getTotalPaid(bill);
    const today = new Date();
    const dueDate = new Date(bill.due_date);

    if (balance <= 0) return "PAID";
    if (paid > 0) return "PARTIAL";
    if (today > dueDate) return "OVERDUE";
    return "UNPAID";
  };

  const getStatusStyle = (status: string) => {
    if (status === "PAID") return "bg-emerald-500/10 text-emerald-400";
    if (status === "PARTIAL") return "bg-amber-500/10 text-amber-400";
    if (status === "OVERDUE") return "bg-red-500/10 text-red-400";
    return "bg-slate-700 text-slate-300";
  };

  /// CALCULATIONS
  const totalReceivable = bills.reduce(
    (sum, bill) => sum + getTotalBill(bill),
    0
  );

  const totalCollected = bills.reduce(
    (sum, bill) => sum + getTotalPaid(bill),
    0
  );

  const totalUnpaid = totalReceivable - totalCollected;

  const overdueCount = bills.filter(
    (bill) => getStatus(bill) === "OVERDUE"
  ).length;

  /// EFFECTS
  useEffect(() => {
    getBills();
  }, []);

  /// UI
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
            Monitor apartment receivables, collections, unpaid balances, and overdue accounts.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/finance/apartment/billing"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:scale-[1.02] hover:border-blue-400 hover:bg-slate-800"
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
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:scale-[1.02] hover:border-emerald-400 hover:bg-slate-800"
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Receivable</p>
            <h2 className="mt-3 text-3xl font-bold">
              {formatMoney(totalReceivable)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Collected</p>
            <h2 className="mt-3 text-3xl font-bold text-emerald-400">
              {formatMoney(totalCollected)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Unpaid</p>
            <h2 className="mt-3 text-3xl font-bold text-red-400">
              {formatMoney(totalUnpaid)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Overdue Accounts</p>
            <h2 className="mt-3 text-3xl font-bold text-amber-400">
              {overdueCount}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">
            Apartment Balance Monitoring
          </h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Total Bill</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => {
                  const status = getStatus(bill);

                  return (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {bill.apartment_units?.unit_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {bill.apartment_units?.tenant_name || "-"}
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
                      No apartment bills yet. Open Billing to create the first bill.
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