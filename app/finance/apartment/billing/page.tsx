"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentBillingPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const [unitId, setUnitId] = useState("");
  const [billMonth, setBillMonth] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [electricAmount, setElectricAmount] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [internetAmount, setInternetAmount] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getUnits = async () => {
    const { data, error } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (error) {
      console.log("GET UNITS ERROR:", error);
      return;
    }

    setUnits(data || []);
  };

  const getBills = async () => {
    const { data, error } = await supabase
      .from("apartment_bills")
      .select(`
        *,
        apartment_units (
          unit_name,
          tenant_name
        ),
        apartment_payments (
          amount
        )
      `)
      .order("due_date", { ascending: false });

    if (error) {
      console.log("GET BILLS ERROR:", error);
      return;
    }

    setBills(data || []);
  };

  const handleUnitChange = (selectedUnitId: string) => {
    setUnitId(selectedUnitId);

    const selectedUnit = units.find((unit) => unit.id === selectedUnitId);

    if (selectedUnit) {
      setRentAmount(String(selectedUnit.monthly_rent || 0));
      setInternetAmount(String(selectedUnit.internet_fee || 0));
    }
  };

  const addBill = async () => {
    if (!unitId || !billMonth || !dueDate) {
      alert("Please select unit, bill month, and due date.");
      return;
    }

    const payload = {
      unit_id: unitId,
      bill_month: billMonth,
      due_date: dueDate,
      rent_amount: Number(rentAmount || 0),
      electric_amount: Number(electricAmount || 0),
      water_amount: Number(waterAmount || 0),
      internet_amount: Number(internetAmount || 0),
      other_amount: Number(otherAmount || 0),
      remarks,
    };

    const { error } = await supabase.from("apartment_bills").insert(payload);

    if (error) {
      console.log("ADD BILL ERROR:", error);
      alert("Failed to create apartment bill.");
      return;
    }

    setUnitId("");
    setBillMonth("");
    setDueDate("");
    setRentAmount("");
    setElectricAmount("");
    setWaterAmount("");
    setInternetAmount("");
    setOtherAmount("");
    setRemarks("");

    getBills();
  };

  const deleteBill = async (id: string) => {
    const confirmDelete = confirm("Delete this bill?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("apartment_bills").delete().eq("id", id);

    if (error) {
      console.log("DELETE BILL ERROR:", error);
      alert("Failed to delete bill.");
      return;
    }

    getBills();
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

  /// EFFECTS
  useEffect(() => {
    getUnits();
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
          <h1 className="mt-2 text-3xl font-bold">Apartment Billing</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create monthly apartment bills including rent, electricity, water, internet, and other charges.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Create Bill</h2>

            <div className="mt-5 space-y-4">
              <select
                value={unitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              >
                <option value="">Select apartment unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_name} - {unit.tenant_name || "No tenant"}
                  </option>
                ))}
              </select>

              <input
                type="month"
                value={billMonth}
                onChange={(e) => setBillMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Rent amount"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Electric amount"
                value={electricAmount}
                onChange={(e) => setElectricAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Water amount"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Internet amount"
                value={internetAmount}
                onChange={(e) => setInternetAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                placeholder="Other charges"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <textarea
                placeholder="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <button
                onClick={addBill}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Create Apartment Bill
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <h2 className="mb-4 text-xl font-bold">Created Bills</h2>

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
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white">
                        {bill.apartment_units?.unit_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {bill.apartment_units?.tenant_name || "-"}
                      </td>
                      <td className="px-4 py-3">{bill.bill_month}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(getTotalBill(bill))}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatMoney(getTotalPaid(bill))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {formatMoney(getBalance(bill))}
                      </td>
                      <td className="px-4 py-3">{bill.due_date}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteBill(bill.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {bills.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No apartment bills created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}