"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentBillingPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getData = async () => {
    const { data: unitsData, error: unitsError } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (unitsError) {
      console.log("GET APARTMENT UNITS ERROR:", unitsError);
      return;
    }

    const { data: billsData, error: billsError } = await supabase
      .from("apartment_bills")
      .select(`
        *,
        apartment_payments (
          amount
        )
      `)
      .order("due_date", { ascending: false });

    if (billsError) {
      console.log("GET APARTMENT BILLS ERROR:", billsError);
      return;
    }

    setUnits(unitsData || []);
    setBills(billsData || []);
  };

  const getTotalBill = (bill: any) => {
    if (!bill) return 0;

    return (
      Number(bill.rent_amount || 0) +
      Number(bill.electric_amount || 0) +
      Number(bill.water_amount || 0) +
      Number(bill.internet_amount || 0) +
      Number(bill.other_amount || 0)
    );
  };

  const getTotalPaid = (bill: any) => {
    if (!bill) return 0;

    return (bill.apartment_payments || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0
    );
  };

  const getBalance = (bill: any) => {
    return getTotalBill(bill) - getTotalPaid(bill);
  };

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
    if (status === "NO BILL") return "bg-slate-700 text-slate-300";
    return "bg-slate-700 text-slate-300";
  };

  const getUnitStatusStyle = (status: string) => {
    const value = String(status || "").toLowerCase();

    if (value === "occupied") return "bg-emerald-500/10 text-emerald-400";
    if (value === "active") return "bg-blue-500/10 text-blue-400";
    if (value === "vacant") return "bg-slate-700 text-slate-300";
    if (value === "inactive") return "bg-red-500/10 text-red-400";

    return "bg-slate-700 text-slate-300";
  };

  const getActionNeeded = (status: string) => {
    if (status === "NO BILL") return "Create monthly bill";
    if (status === "OVERDUE") return "Follow up payment";
    if (status === "PARTIAL") return "Collect remaining balance";
    if (status === "UNPAID") return "Awaiting payment";
    if (status === "PAID") return "Cleared";
    return "-";
  };

  const getActionStyle = (status: string) => {
    if (status === "NO BILL") return "text-slate-400";
    if (status === "OVERDUE") return "text-red-400";
    if (status === "PARTIAL") return "text-amber-400";
    if (status === "UNPAID") return "text-orange-400";
    if (status === "PAID") return "text-emerald-400";
    return "text-slate-400";
  };

  /// CALCULATIONS
  const activeUnits = units.filter((unit) => {
    const status = String(unit.status || "").toLowerCase();
    return status === "active" || status === "occupied";
  });

  const occupiedUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied"
  );

  const vacantUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "vacant"
  );

  const unitMonitoring = useMemo(() => {
    return activeUnits.map((unit) => {
      const unitBills = bills
        .filter((bill) => String(bill.unit_id) === String(unit.id))
        .sort((a, b) => String(b.due_date || "").localeCompare(String(a.due_date || "")));

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

      const unpaidBills = unitBills.filter((bill) => getBalance(bill) > 0);
      const overdueBills = unitBills.filter(
        (bill) => getBillStatus(bill) === "OVERDUE"
      );

      return {
        unit,
        latestBill,
        unitBills,
        totalReceivable,
        totalPaid,
        totalBalance,
        unpaidBills,
        overdueBills,
        status: latestBill ? getBillStatus(latestBill) : "NO BILL",
      };
    });
  }, [activeUnits, bills]);

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
    (row) => row.overdueBills.length > 0
  ).length;

  const noBillCount = unitMonitoring.filter(
    (row) => row.status === "NO BILL"
  ).length;

  /// EFFECTS
  useEffect(() => {
    getData();
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
            Monitor active apartments, tenant balances, collections, unpaid bills, and overdue accounts.
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
          <SummaryCard title="Active Units" value={activeUnits.length} />
          <SummaryCard title="Occupied Units" value={occupiedUnits.length} color="text-emerald-400" />
          <SummaryCard title="Vacant Units" value={vacantUnits.length} color="text-slate-300" />
          <SummaryCard title="Overdue Units" value={overdueCount} color="text-amber-400" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Receivable" value={formatMoney(totalReceivable)} />
          <SummaryCard title="Total Collected" value={formatMoney(totalCollected)} color="text-emerald-400" />
          <SummaryCard title="Total Unpaid" value={formatMoney(totalUnpaid)} color="text-red-400" />
          <SummaryCard title="No Bill Yet" value={noBillCount} color="text-slate-300" />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Active Apartment Monitoring</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Unit Status</th>
                  <th className="px-4 py-3">Latest Bill Month</th>
                  <th className="px-4 py-3 text-right">Latest Bill</th>
                  <th className="px-4 py-3 text-right">Latest Paid</th>
                  <th className="px-4 py-3 text-right">Latest Balance</th>
                  <th className="px-4 py-3 text-right">Total Balance</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Bill Status</th>
                  <th className="px-4 py-3">Action Needed</th>
                </tr>
              </thead>

              <tbody>
                {unitMonitoring.map((row) => {
                  const latestBill = row.latestBill;
                  const status = row.status;
                  const latestBalance = latestBill ? getBalance(latestBill) : 0;

                  return (
                    <tr
                      key={row.unit.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-bold text-white">
                        {row.unit.unit_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {row.unit.tenant_name || "No tenant name"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getUnitStatusStyle(
                            row.unit.status
                          )}`}
                        >
                          {row.unit.status || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {latestBill?.bill_month || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatMoney(getTotalBill(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(latestBill))}
                      </td>

                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(latestBalance)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-amber-400">
                        {formatMoney(row.totalBalance)}
                      </td>

                      <td className="px-4 py-3">
                        {latestBill?.due_date || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className={`px-4 py-3 text-xs font-bold ${getActionStyle(status)}`}>
                        {getActionNeeded(status)}
                      </td>
                    </tr>
                  );
                })}

                {unitMonitoring.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No active or occupied apartment units found.
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
            <table className="w-full min-w-[1000px] text-sm">
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
                  const unit = units.find(
                    (item) => String(item.id) === String(bill.unit_id)
                  );

                  const status = getBillStatus(bill);

                  return (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {unit?.unit_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
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

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-3 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}