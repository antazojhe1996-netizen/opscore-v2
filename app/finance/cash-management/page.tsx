"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function CashManagementPage() {
  /// STATES - DATABASE DATA
  const [movements, setMovements] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);
  const [manualExpenses, setManualExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  /// STATES - DRAWER
  const today = new Date().toISOString().split("T")[0];

  const [drawerHolder, setDrawerHolder] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [drawerRemarks, setDrawerRemarks] = useState("");
  const [actualClosingCash, setActualClosingCash] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");

  /// STATES - CASH MOVEMENT FORM
  const [businessDate, setBusinessDate] = useState(today);
  const [movementType, setMovementType] = useState("Cash In");
  const [source, setSource] = useState("Room Sales");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [fromPerson, setFromPerson] = useState("");
  const [toPerson, setToPerson] = useState("");
  const [encodedBy, setEncodedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  /// STATES - FILTERS
  const [dateFilter, setDateFilter] = useState(today);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [holderFilter, setHolderFilter] = useState("AUTO");
  const [searchTerm, setSearchTerm] = useState("");

  /// STATES - SYSTEM
  const [isSaving, setIsSaving] = useState(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);

  /// DATA - OPTIONS
  const movementTypes = [
    "Opening Float",
    "Cash In",
    "Cash Out",
    "Remittance",
    "Adjustment",
  ];

  const sourceOptions = [
    "Room Sales",
    "Restaurant Sales",
    "Apartment Collection",
    "Expense Release",
    "Manual Cash Expense",
    "Owner Withdrawal",
    "Bank Deposit",
    "Petty Cash",
    "Other",
  ];

  const paymentTypes = ["Cash", "GCash", "Bank", "Terminal"];

  /// CALCULATIONS - ACTIVE DRAWER
  const activeDrawer = drawers.find((drawer) => drawer.status === "OPEN");

  const effectiveHolderFilter =
    holderFilter === "AUTO" ? activeDrawer?.holder_name || "ALL" : holderFilter;

  /// CALCULATIONS - BASE MOVEMENTS
  const drawerScopedMovements = useMemo(() => {
    if (activeDrawer) {
      return movements.filter((item) => item.cash_drawer_id === activeDrawer.id);
    }

    return movements.filter((item) => item.business_date === dateFilter);
  }, [movements, activeDrawer, dateFilter]);

  /// CALCULATIONS - LEDGER FILTERED MOVEMENTS
  const filteredMovements = useMemo(() => {
    return drawerScopedMovements.filter((item) => {
      const matchesType =
        typeFilter === "ALL" ? true : item.movement_type === typeFilter;

      const matchesPayment =
        paymentFilter === "ALL"
          ? true
          : (item.payment_type || "Cash") === paymentFilter;

      const matchesHolder =
        effectiveHolderFilter === "ALL"
          ? true
          : item.from_person === effectiveHolderFilter ||
            item.to_person === effectiveHolderFilter ||
            item.encoded_by === effectiveHolderFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.source || "").toLowerCase().includes(search) ||
        String(item.from_person || "").toLowerCase().includes(search) ||
        String(item.to_person || "").toLowerCase().includes(search) ||
        String(item.encoded_by || "").toLowerCase().includes(search) ||
        String(item.remarks || "").toLowerCase().includes(search);

      return matchesType && matchesPayment && matchesHolder && matchesSearch;
    });
  }, [
    drawerScopedMovements,
    typeFilter,
    paymentFilter,
    effectiveHolderFilter,
    searchTerm,
  ]);

  /// CALCULATIONS - CASH ONLY MOVEMENTS
  const cashOnlyMovements = drawerScopedMovements.filter(
    (item) => (item.payment_type || "Cash") === "Cash"
  );

  const cashInTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) > 0)
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOutTotal = cashOnlyMovements
    .filter(
      (item) =>
        item.movement_type === "Cash Out" ||
        item.source === "Bank Deposit" ||
        item.source === "Owner Withdrawal" ||
        (item.movement_type === "Adjustment" && Number(item.amount || 0) < 0)
    )
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const remittanceTotal = cashOnlyMovements
    .filter((item) => item.movement_type === "Remittance")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cashOnHand = cashInTotal - cashOutTotal;

  /// CALCULATIONS - DIGITAL / NON-CASH FUNDS
  const gcashTotal = drawerScopedMovements
    .filter((item) => (item.payment_type || "Cash") === "GCash")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const bankTotal = drawerScopedMovements
    .filter(
      (item) =>
        (item.payment_type || "Cash") === "Bank" ||
        item.source === "Bank Deposit"
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const terminalTotal = drawerScopedMovements
    .filter((item) => (item.payment_type || "Cash") === "Terminal")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  /// CALCULATIONS - CASH HOLDER BALANCES
  const holderBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    cashOnlyMovements.forEach((item) => {
      const value = Number(item.amount || 0);
      const fromName = item.from_person || "";
      const toName = item.to_person || "";

      if (
        item.movement_type === "Opening Float" ||
        item.movement_type === "Cash In"
      ) {
        if (toName) balances[toName] = (balances[toName] || 0) + value;
      }

      if (item.movement_type === "Cash Out") {
        if (fromName) balances[fromName] = (balances[fromName] || 0) - value;
      }

      if (item.movement_type === "Remittance") {
        if (fromName) balances[fromName] = (balances[fromName] || 0) - value;

        if (
          toName &&
          item.source !== "Bank Deposit" &&
          item.source !== "Owner Withdrawal"
        ) {
          balances[toName] = (balances[toName] || 0) + value;
        }
      }

      if (item.movement_type === "Adjustment") {
        if (toName && value > 0) balances[toName] = (balances[toName] || 0) + value;

        if (fromName && value < 0) {
          balances[fromName] = (balances[fromName] || 0) - Math.abs(value);
        }
      }
    });

    return Object.entries(balances)
      .map(([name, balance]) => ({ name, balance }))
      .filter((item) => Math.abs(item.balance) > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [cashOnlyMovements]);

  const activeDrawerCash =
    holderBalances.find((holder) => holder.name === activeDrawer?.holder_name)
      ?.balance || 0;

  /// CALCULATIONS - PENDING MANUAL CASH EXPENSES
  const pendingManualCashExpenses = manualExpenses.filter((expense) => {
    const payment = String(expense.payment_method || "").toLowerCase();

    return (
      expense.expense_date === dateFilter &&
      payment.includes("cash") &&
      !expense.posted_to_cash_movements
    );
  });

  const pendingManualCashExpenseAmount = pendingManualCashExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const pendingReleasedExpenses = expenseRequests
    .filter((item) => item.status === "RELEASED")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  /// FUNCTIONS - FORMATTERS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (value: any) => {
    if (!value) return "-";
    return String(value).slice(0, 16).replace("T", " ");
  };

  const getMovementStyle = (type: string) => {
    if (type === "Opening Float") return "bg-blue-500/10 text-blue-400";
    if (type === "Cash In") return "bg-emerald-500/10 text-emerald-400";
    if (type === "Cash Out") return "bg-red-500/10 text-red-400";
    if (type === "Remittance") return "bg-amber-500/10 text-amber-400";
    if (type === "Adjustment") return "bg-purple-500/10 text-purple-400";
    return "bg-slate-700 text-slate-300";
  };

  const getPaymentStyle = (payment: string) => {
    if (payment === "Cash") return "bg-emerald-500/10 text-emerald-400";
    if (payment === "GCash") return "bg-purple-500/10 text-purple-400";
    if (payment === "Bank") return "bg-blue-500/10 text-blue-400";
    if (payment === "Terminal") return "bg-sky-500/10 text-sky-400";
    return "bg-slate-700 text-slate-300";
  };

  /// FUNCTIONS - GET DATA
  const getCashMovements = async () => {
    const { data, error } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .order("business_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET CASH MOVEMENTS ERROR:", error);
      return;
    }

    setMovements(data || []);
  };

  const getDrawers = async () => {
    const { data, error } = await supabase
      .from("finance_cash_drawers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET DRAWERS ERROR:", error);
      return;
    }

    setDrawers(data || []);
  };

  const getExpenseRequests = async () => {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EXPENSE REQUESTS ERROR:", error);
      return;
    }

    setExpenseRequests(data || []);
  };

  const getManualExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      console.log("GET MANUAL EXPENSES ERROR:", error);
      return;
    }

    setManualExpenses(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    setEmployees(data || []);
  };

  /// FUNCTIONS - RESET
  const resetForm = () => {
    setBusinessDate(today);
    setMovementType("Cash In");
    setSource("Room Sales");
    setPaymentType("Cash");
    setAmount("");
    setFromPerson("");
    setToPerson("");
    setEncodedBy("");
    setRemarks("");
  };

  const resetDrawerForm = () => {
    setDrawerHolder("");
    setOpeningFloat("");
    setDrawerRemarks("");
    setActualClosingCash("");
    setCloseRemarks("");
  };

  /// FUNCTIONS - PDF / PRINT REPORT
const printDrawerReport = (drawer: any, customSummary?: any) => {
  const holderName = customSummary?.holder_name || drawer.holder_name;
  const openedAt = drawer.opened_at;
  const closedAt = customSummary?.closed_at || drawer.closed_at;
  const status = customSummary?.status || drawer.status;

  const openingFloat = Number(
    customSummary?.opening_float ?? drawer.opening_float ?? 0
  );

  const expectedCash = Number(
    customSummary?.expected_cash ?? drawer.expected_cash ?? activeDrawerCash
  );

  const actualCash = Number(
    customSummary?.actual_cash ?? drawer.actual_cash ?? 0
  );

  const variance = Number(
    customSummary?.variance ?? drawer.variance ?? actualCash - expectedCash
  );

  const reportMovements = movements.filter(
    (item) => item.cash_drawer_id === drawer.id
  );

  const salesRows = reportMovements.filter(
    (item) =>
      item.movement_type === "Cash In" ||
      item.source === "Room Sales" ||
      item.source === "Restaurant Sales" ||
      item.source === "Apartment Collection"
  );

  const expenseRows = reportMovements.filter(
    (item) =>
      item.movement_type === "Cash Out" ||
      item.source === "Manual Cash Expense" ||
      item.source === "Expense Release" ||
      item.source === "Owner Withdrawal" ||
      item.source === "Bank Deposit"
  );

  const salesByPayment = (payment: string) =>
    salesRows
      .filter((item) => (item.payment_type || "Cash") === payment)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const salesBySource = (sourceName: string) =>
    salesRows
      .filter((item) => item.source === sourceName)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expensesBySource = (sourceName: string) =>
    expenseRows
      .filter((item) => item.source === sourceName)
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const cashSales = salesByPayment("Cash");
  const gcashSales = salesByPayment("GCash");
  const bankSales = salesByPayment("Bank");
  const terminalSales = salesByPayment("Terminal");

  const roomSales = salesBySource("Room Sales");
  const restaurantSales = salesBySource("Restaurant Sales");
  const apartmentSales = salesBySource("Apartment Collection");
  const otherSales = salesRows
    .filter(
      (item) =>
        !["Room Sales", "Restaurant Sales", "Apartment Collection"].includes(
          item.source
        )
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const manualCashExpenses = expensesBySource("Manual Cash Expense");
  const expenseRelease = expensesBySource("Expense Release");
  const ownerWithdrawal = expensesBySource("Owner Withdrawal");
  const bankDeposit = expensesBySource("Bank Deposit");
  const otherExpenses = expenseRows
    .filter(
      (item) =>
        ![
          "Manual Cash Expense",
          "Expense Release",
          "Owner Withdrawal",
          "Bank Deposit",
        ].includes(item.source)
    )
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  const totalSales = cashSales + gcashSales + bankSales + terminalSales;

  const totalExpenses =
    manualCashExpenses +
    expenseRelease +
    ownerWithdrawal +
    bankDeposit +
    otherExpenses;

  const varianceStatus =
    variance < 0 ? "SHORT" : variance > 0 ? "OVER" : "BALANCED";

  const reportDate =
    reportMovements[0]?.business_date || today || new Date().toISOString().split("T")[0];

  const salesTableRows = salesRows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.business_date || "-"}</td>
          <td>${item.source || "-"}</td>
          <td>${item.payment_type || "Cash"}</td>
          <td>${item.from_person || "-"}</td>
          <td>${item.to_person || "-"}</td>
          <td>${item.encoded_by || "-"}</td>
          <td class="amount">${formatMoney(item.amount)}</td>
          <td>${item.remarks || "-"}</td>
        </tr>
      `
    )
    .join("");

  const expenseTableRows = expenseRows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.business_date || "-"}</td>
          <td>${item.source || "-"}</td>
          <td>${item.payment_type || "Cash"}</td>
          <td>${item.from_person || "-"}</td>
          <td>${item.to_person || "-"}</td>
          <td>${item.encoded_by || "-"}</td>
          <td class="amount">${formatMoney(Math.abs(Number(item.amount || 0)))}</td>
          <td>${item.remarks || "-"}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Daily Executive Finance Report</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #f3f4f6;
          }

          .print-btn {
            position: fixed;
            top: 18px;
            right: 18px;
            z-index: 999;
            border: none;
            border-radius: 6px;
            background: #111827;
            color: white;
            padding: 10px 16px;
            font-weight: bold;
            cursor: pointer;
          }

          .page {
            width: 297mm;
            min-height: 210mm;
            margin: 18px auto;
            padding: 18mm;
            background: white;
            page-break-after: always;
          }

          .page:last-child {
            page-break-after: auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #111827;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }

          .hotel-title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }

          .report-title {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            text-align: right;
          }

          .muted {
            margin-top: 4px;
            color: #6b7280;
            font-size: 11px;
          }

          .section {
            margin-top: 18px;
          }

          .section-title {
            border-bottom: 2px solid #111827;
            padding-bottom: 5px;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }

          .info-box {
            border: 1px solid #d1d5db;
            padding: 10px;
          }

          .label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .value {
            margin-top: 5px;
            font-size: 14px;
            font-weight: 800;
          }

          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 7px 8px;
            vertical-align: top;
          }

          th {
            background: #111827;
            color: #ffffff;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .summary-table td:first-child {
            color: #374151;
          }

          .amount {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
          }

          .total-row td {
            background: #f9fafb;
            font-weight: 800;
          }

          .grand-row td {
            background: #111827;
            color: white;
            font-size: 13px;
            font-weight: 800;
          }

          .variance-balanced {
            color: #111827;
          }

          .variance-short {
            color: #b91c1c;
          }

          .variance-over {
            color: #047857;
          }

          .remarks-box {
            border: 1px solid #d1d5db;
            min-height: 58px;
            padding: 10px;
            font-size: 11px;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 50px;
            margin-top: 54px;
          }

          .signature {
            border-top: 1px solid #111827;
            padding-top: 8px;
            text-align: center;
            font-size: 11px;
          }

          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
            display: flex;
            justify-content: space-between;
            color: #6b7280;
            font-size: 10px;
          }

          .page-label {
            text-align: right;
            color: #6b7280;
            font-size: 10px;
            margin-top: 12px;
          }

          @media print {
            body {
              background: white;
            }

            .print-btn {
              display: none;
            }

            .page {
              margin: 0;
              width: auto;
              min-height: auto;
              box-shadow: none;
              page-break-after: always;
            }

            .page:last-child {
              page-break-after: auto;
            }

            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>
        <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

        <!-- PAGE 1: EXECUTIVE SUMMARY -->
        <section class="page">
          <div class="header">
            <div>
              <div class="hotel-title">Vincent Resort Hotel</div>
              <div class="muted">Operations Finance Control</div>
              <div class="muted">Generated: ${formatDateTime(new Date().toISOString())}</div>
            </div>

            <div>
              <div class="report-title">Front Desk Finance Report</div>
              <div class="muted">Business Date: ${reportDate}</div>
              <div class="muted">Report Status: ${status}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Report Information</div>
            <div class="info-grid">
              <div class="info-box">
                <div class="label">Drawer Holder</div>
                <div class="value">${holderName || "-"}</div>
              </div>
              <div class="info-box">
                <div class="label">Opened</div>
                <div class="value">${formatDateTime(openedAt)}</div>
              </div>
              <div class="info-box">
                <div class="label">Closed</div>
                <div class="value">${formatDateTime(closedAt)}</div>
              </div>
              <div class="info-box">
                <div class="label">Variance Status</div>
                <div class="value">${varianceStatus}</div>
              </div>
            </div>
          </div>

          <div class="section two-col">
            <div>
              <div class="section-title">Cash Reconciliation</div>
              <table class="summary-table">
                <tr>
                  <td>Opening Float</td>
                  <td class="amount">${formatMoney(openingFloat)}</td>
                </tr>
                <tr>
                  <td>Add: Cash Sales</td>
                  <td class="amount">${formatMoney(cashSales)}</td>
                </tr>
                <tr>
                  <td>Less: Cash Expenses / Releases</td>
                  <td class="amount">(${formatMoney(totalExpenses)})</td>
                </tr>
                <tr class="total-row">
                  <td>Expected Cash</td>
                  <td class="amount">${formatMoney(expectedCash)}</td>
                </tr>
                <tr>
                  <td>Actual Cash Counted</td>
                  <td class="amount">${formatMoney(actualCash)}</td>
                </tr>
                <tr class="grand-row">
                  <td>Variance - ${varianceStatus}</td>
                  <td class="amount">${formatMoney(variance)}</td>
                </tr>
              </table>
            </div>

            <div>
              <div class="section-title">Collection Summary</div>
              <table class="summary-table">
                <tr>
                  <td>Cash Sales</td>
                  <td class="amount">${formatMoney(cashSales)}</td>
                </tr>
                <tr>
                  <td>GCash Sales</td>
                  <td class="amount">${formatMoney(gcashSales)}</td>
                </tr>
                <tr>
                  <td>Bank Transfer</td>
                  <td class="amount">${formatMoney(bankSales)}</td>
                </tr>
                <tr>
                  <td>Terminal / Card</td>
                  <td class="amount">${formatMoney(terminalSales)}</td>
                </tr>
                <tr class="grand-row">
                  <td>Total Sales</td>
                  <td class="amount">${formatMoney(totalSales)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section two-col">
            <div>
              <div class="section-title">Sales Summary</div>
              <table class="summary-table">
                <tr>
                  <td>Room Sales</td>
                  <td class="amount">${formatMoney(roomSales)}</td>
                </tr>
                <tr>
                  <td>Restaurant Sales</td>
                  <td class="amount">${formatMoney(restaurantSales)}</td>
                </tr>
                <tr>
                  <td>Apartment Collection</td>
                  <td class="amount">${formatMoney(apartmentSales)}</td>
                </tr>
                <tr>
                  <td>Other Sales</td>
                  <td class="amount">${formatMoney(otherSales)}</td>
                </tr>
                <tr class="grand-row">
                  <td>Total Sales</td>
                  <td class="amount">${formatMoney(totalSales)}</td>
                </tr>
              </table>
            </div>

            <div>
              <div class="section-title">Expense Summary</div>
              <table class="summary-table">
                <tr>
                  <td>Manual Cash Expenses</td>
                  <td class="amount">${formatMoney(manualCashExpenses)}</td>
                </tr>
                <tr>
                  <td>Expense Releases</td>
                  <td class="amount">${formatMoney(expenseRelease)}</td>
                </tr>
                <tr>
                  <td>Owner Withdrawal</td>
                  <td class="amount">${formatMoney(ownerWithdrawal)}</td>
                </tr>
                <tr>
                  <td>Bank Deposit</td>
                  <td class="amount">${formatMoney(bankDeposit)}</td>
                </tr>
                <tr>
                  <td>Other Expenses</td>
                  <td class="amount">${formatMoney(otherExpenses)}</td>
                </tr>
                <tr class="grand-row">
                  <td>Total Expenses</td>
                  <td class="amount">${formatMoney(totalExpenses)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Frontdesk Remarks</div>
            <div class="remarks-box">
              ${customSummary?.remarks || drawer.remarks || "No remarks provided."}
            </div>
          </div>

          <div class="signature-grid">
            <div class="signature">Prepared By / Cashier</div>
            <div class="signature">Checked By / Supervisor</div>
            <div class="signature">Verified By / Finance</div>
          </div>

          <div class="footer">
            <span>OpsCore Executive Finance Report</span>
            <span>Page 1 - Executive Summary</span>
          </div>
        </section>

        <!-- PAGE 2: SALES DETAILS -->
        <section class="page">
          <div class="header">
            <div>
              <div class="hotel-title">Vincent Resort Hotel</div>
              <div class="muted">Sales Transaction Details</div>
            </div>
            <div>
              <div class="report-title">Sales Report</div>
              <div class="muted">Business Date: ${reportDate}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Sales Details</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Payment</th>
                  <th>From</th>
                  <th>Received By</th>
                  <th>Encoded By</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${
                  salesTableRows ||
                  `<tr><td colspan="9" style="text-align:center;">No sales records found.</td></tr>`
                }
                <tr class="grand-row">
                  <td colspan="7">Total Sales</td>
                  <td class="amount">${formatMoney(totalSales)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <span>OpsCore Executive Finance Report</span>
            <span>Page 2 - Sales Details</span>
          </div>
        </section>

        <!-- PAGE 3: EXPENSE DETAILS -->
        <section class="page">
          <div class="header">
            <div>
              <div class="hotel-title">Vincent Resort Hotel</div>
              <div class="muted">Expense Transaction Details</div>
            </div>
            <div>
              <div class="report-title">Expense Report</div>
              <div class="muted">Business Date: ${reportDate}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Expense Details</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Payment</th>
                  <th>Released By</th>
                  <th>Received By</th>
                  <th>Encoded By</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${
                  expenseTableRows ||
                  `<tr><td colspan="9" style="text-align:center;">No expense records found.</td></tr>`
                }
                <tr class="grand-row">
                  <td colspan="7">Total Expenses</td>
                  <td class="amount">${formatMoney(totalExpenses)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <span>OpsCore Executive Finance Report</span>
            <span>Page 3 - Expense Details</span>
          </div>
        </section>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1200,height=850");

  if (!printWindow) {
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
};

  /// FUNCTIONS - OPEN DRAWER
  const openDrawer = async () => {
    if (isSaving) return;

    if (activeDrawer) {
      alert("There is already an open drawer.");
      return;
    }

    if (!drawerHolder || !openingFloat) {
      alert("Please select drawer holder and opening float.");
      return;
    }

    setIsSaving(true);

    const { data: drawerData, error: drawerError } = await supabase
      .from("finance_cash_drawers")
      .insert({
        holder_name: drawerHolder,
        opening_float: Number(openingFloat || 0),
        status: "OPEN",
        remarks: drawerRemarks.trim(),
      })
      .select()
      .single();

    if (drawerError) {
      setIsSaving(false);
      console.log("OPEN DRAWER ERROR:", drawerError);
      alert("Failed to open drawer.");
      return;
    }

    const { error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: today,
        movement_type: "Opening Float",
        source: "Petty Cash",
        payment_type: "Cash",
        amount: Number(openingFloat || 0),
        from_person: "",
        to_person: drawerHolder,
        encoded_by: drawerHolder,
        remarks: drawerRemarks.trim() || "Opening drawer float",
        cash_drawer_id: drawerData.id,
      });

    setIsSaving(false);

    if (movementError) {
      console.log("OPEN DRAWER MOVEMENT ERROR:", movementError);
      alert("Drawer opened, but opening float movement failed.");
      return;
    }

    resetDrawerForm();
    setShowOpenDrawer(false);
    setHolderFilter("AUTO");
    getDrawers();
    getCashMovements();
  };

  /// FUNCTIONS - CLOSE DRAWER
  const closeDrawer = async () => {
    if (isSaving) return;

    if (!activeDrawer) {
      alert("No active drawer to close.");
      return;
    }

    if (!actualClosingCash) {
      alert("Please enter actual closing cash.");
      return;
    }

    const drawerExpectedCash = activeDrawerCash;
    const drawerVariance = Number(actualClosingCash || 0) - drawerExpectedCash;
    const closedAt = new Date().toISOString();

    setIsSaving(true);

    const { error } = await supabase
      .from("finance_cash_drawers")
      .update({
        status: "CLOSED",
        closed_at: closedAt,
        expected_cash: drawerExpectedCash,
        actual_cash: Number(actualClosingCash || 0),
        variance: drawerVariance,
        remarks: closeRemarks.trim() || activeDrawer.remarks || "",
      })
      .eq("id", activeDrawer.id);

    setIsSaving(false);

    if (error) {
      console.log("CLOSE DRAWER ERROR:", error);
      alert("Failed to close drawer.");
      return;
    }

    printDrawerReport(activeDrawer, {
      ...activeDrawer,
      closed_at: closedAt,
      status: "CLOSED",
      expected_cash: drawerExpectedCash,
      actual_cash: Number(actualClosingCash || 0),
      variance: drawerVariance,
    });

    resetDrawerForm();
    setShowCloseDrawer(false);
    getDrawers();
  };

  /// FUNCTIONS - SAVE CASH MOVEMENT
  const saveMovement = async () => {
    if (isSaving) return;

    if (!businessDate || !movementType || !source || !paymentType || !amount) {
      alert("Please complete date, type, source, payment type, and amount.");
      return;
    }

    const amountValue = Number(amount);

    if (amountValue === 0) {
      alert("Amount cannot be zero.");
      return;
    }

    const autoFrom =
      paymentType === "Cash" && !fromPerson.trim()
        ? activeDrawer?.holder_name || ""
        : fromPerson.trim();

    const autoTo =
      paymentType === "Cash" && !toPerson.trim()
        ? activeDrawer?.holder_name || ""
        : toPerson.trim();

    const autoEncoded = encodedBy.trim() || activeDrawer?.holder_name || "System";

    if (
      paymentType === "Cash" &&
      (movementType === "Cash In" || movementType === "Opening Float") &&
      !autoTo
    ) {
      alert("Please open a drawer or enter who received/holds the cash.");
      return;
    }

    if (paymentType === "Cash" && movementType === "Cash Out" && !autoFrom) {
      alert("Please open a drawer or enter who released the cash.");
      return;
    }

    if (
      paymentType === "Cash" &&
      movementType === "Remittance" &&
      (!autoFrom || !toPerson.trim())
    ) {
      alert("Please enter remitted by and received by.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("finance_cash_movements").insert({
      business_date: businessDate,
      movement_type: movementType,
      source,
      payment_type: paymentType,
      amount: amountValue,
      from_person: autoFrom,
      to_person: autoTo,
      encoded_by: autoEncoded,
      remarks: remarks.trim(),
      cash_drawer_id: activeDrawer?.id || null,
    });

    setIsSaving(false);

    if (error) {
      console.log("SAVE CASH MOVEMENT ERROR:", error);
      alert("Failed to save cash movement.");
      return;
    }

    resetForm();
    getCashMovements();
  };

  /// FUNCTIONS - MOVE MANUAL EXPENSE TO CASH MOVEMENT
  const moveExpenseToCashMovement = async (expense: any) => {
    if (isSaving) return;

    if (expense.posted_to_cash_movements) {
      alert("This expense is already moved to cash movement.");
      return;
    }

    if (!activeDrawer) {
      alert("Please open a drawer first.");
      return;
    }

    const confirmMove = confirm("Move this expense to Cash Movement?");
    if (!confirmMove) return;

    setIsSaving(true);

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: expense.expense_date,
        movement_type: "Cash Out",
        source: "Manual Cash Expense",
        payment_type: "Cash",
        amount: Number(expense.amount || 0),
        from_person: activeDrawer.holder_name,
        to_person: "",
        encoded_by: activeDrawer.holder_name,
        remarks: `${expense.description || ""} ${
          expense.remarks ? `- ${expense.remarks}` : ""
        }`.trim(),
        reference_type: "expense",
        reference_id: null,
        cash_drawer_id: activeDrawer.id,
      })
      .select()
      .single();

    if (movementError) {
      setIsSaving(false);
      console.log("MOVE EXPENSE TO CASH MOVEMENT ERROR:", movementError);
      alert("Failed to move expense to cash movement.");
      return;
    }

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        posted_to_cash_movements: true,
        cash_movement_id: movementData.id,
        cash_posted_date: new Date().toISOString(),
      })
      .eq("id", expense.id);

    setIsSaving(false);

    if (updateError) {
      console.log("UPDATE EXPENSE CASH POST ERROR:", updateError);
      alert("Cash movement was created, but expense was not marked as posted.");
      return;
    }

    alert("Expense moved to Cash Movement.");

    getCashMovements();
    getManualExpenses();
  };

  /// FUNCTIONS - DELETE MOVEMENT
  const deleteMovement = async (id: string) => {
    const confirmDelete = confirm("Delete this cash movement?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("finance_cash_movements")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE CASH MOVEMENT ERROR:", error);
      alert("Failed to delete movement.");
      return;
    }

    getCashMovements();
  };

  /// EFFECTS
  useEffect(() => {
    getCashMovements();
    getDrawers();
    getExpenseRequests();
    getManualExpenses();
    getEmployees();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Control
            </p>
            <h1 className="mt-2 text-3xl font-bold">Cash Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              Open drawer, track shift cash movements, clear manual expenses, and print drawer reports.
            </p>
          </div>

          <div className="flex gap-2">
            {activeDrawer && (
              <button
                onClick={() => printDrawerReport(activeDrawer)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-600"
              >
                Print Report
              </button>
            )}

            {!activeDrawer && (
              <button
                onClick={() => setShowOpenDrawer(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500"
              >
                Open Drawer
              </button>
            )}

            {activeDrawer && (
              <button
                onClick={() => setShowCloseDrawer(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500"
              >
                Close Drawer
              </button>
            )}
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          {activeDrawer ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Active Drawer Holder" value={activeDrawer.holder_name} color="text-amber-400" />
              <SummaryCard title="Opening Float" value={formatMoney(activeDrawer.opening_float)} color="text-blue-400" />
              <SummaryCard title="Drawer Cash" value={formatMoney(activeDrawerCash)} color="text-emerald-400" />
              <SummaryCard title="Status" value="OPEN" color="text-emerald-400" />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <h2 className="text-xl font-bold text-amber-400">No Active Drawer</h2>
              <p className="mt-1 text-sm text-slate-300">
                Open a drawer first before moving manual cash expenses.
              </p>
            </div>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Cash On Hand" value={formatMoney(cashOnHand)} color="text-emerald-400" />
          <SummaryCard title="GCash / Digital" value={formatMoney(gcashTotal)} color="text-purple-400" />
          <SummaryCard title="Bank" value={formatMoney(bankTotal)} color="text-blue-400" />
          <SummaryCard title="Terminal" value={formatMoney(terminalTotal)} color="text-sky-400" />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Cash In" value={formatMoney(cashInTotal)} color="text-blue-400" />
          <SummaryCard title="Cash Out" value={formatMoney(cashOutTotal)} color="text-red-400" />
          <SummaryCard title="Cash Remitted" value={formatMoney(remittanceTotal)} color="text-amber-400" />
          <SummaryCard title="Pending Cash Expenses" value={formatMoney(pendingManualCashExpenseAmount)} color="text-red-400" />
        </section>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Add Cash Movement</h2>

            <div className="mt-5 space-y-4">
              <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} style={{ colorScheme: "dark" }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                {movementTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                {sourceOptions.map((item) => <option key={item}>{item}</option>)}
              </select>

              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                {paymentTypes.map((item) => <option key={item}>{item}</option>)}
              </select>

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              {(movementType === "Cash Out" || movementType === "Remittance" || movementType === "Adjustment") && (
                <input value={fromPerson} onChange={(e) => setFromPerson(e.target.value)} placeholder={activeDrawer ? `From: ${activeDrawer.holder_name}` : "From / Released by"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              {(movementType === "Opening Float" || movementType === "Cash In" || movementType === "Remittance" || movementType === "Adjustment") && (
                <input value={toPerson} onChange={(e) => setToPerson(e.target.value)} placeholder={activeDrawer ? `To: ${activeDrawer.holder_name}` : "To / Received by / Holder"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              <input value={encodedBy} onChange={(e) => setEncodedBy(e.target.value)} placeholder={activeDrawer ? `Encoded by: ${activeDrawer.holder_name}` : "Encoded by"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <datalist id="employee-list">
                {employees.map((employee) => (
                  <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`} />
                ))}
              </datalist>

              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Remarks / reference / purpose" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <button onClick={saveMovement} disabled={isSaving} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? "Saving..." : "Save Cash Movement"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Cash Movement Ledger</h2>

            <div className="my-5 grid grid-cols-1 gap-3 md:grid-cols-5">
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select value={holderFilter} onChange={(e) => setHolderFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="AUTO">Auto Holder</option>
                <option value="ALL">All Holders</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Types</option>
                {movementTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="ALL">All Payments</option>
                {paymentTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
            </div>

            <div className="max-h-[700px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To / Holder</th>
                    <th className="px-4 py-3">Encoded By</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40">
                      <td className="px-4 py-3">{item.business_date}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getMovementStyle(item.movement_type)}`}>{item.movement_type}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStyle(item.payment_type || "Cash")}`}>{item.payment_type || "Cash"}</span></td>
                      <td className="px-4 py-3">{item.source}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.amount)}</td>
                      <td className="px-4 py-3">{item.from_person || "-"}</td>
                      <td className="px-4 py-3">{item.to_person || "-"}</td>
                      <td className="px-4 py-3">{item.encoded_by || "-"}</td>
                      <td className="px-4 py-3">{item.remarks || "-"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteMovement(item.id)} className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-500">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">No cash movements found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 shadow-lg">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-red-400">Pending Manual Cash Expenses</h2>
            <p className="mt-1 text-sm text-slate-300">
              Cash expenses from Expenses Ledger that are not yet moved to Cash Movement.
            </p>
          </div>

          <div className="overflow-auto rounded-xl border border-red-500/20">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingManualCashExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-red-500/20 text-slate-200">
                    <td className="px-4 py-3">{expense.expense_date}</td>
                    <td className="px-4 py-3">{expense.department || "-"}</td>
                    <td className="px-4 py-3">{expense.category || "-"}</td>
                    <td className="px-4 py-3">{expense.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-400">{formatMoney(expense.amount)}</td>
                    <td className="px-4 py-3">{expense.payment_method || "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => moveExpenseToCashMovement(expense)} disabled={isSaving || !activeDrawer} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
                        Move to Cash Movement
                      </button>
                    </td>
                  </tr>
                ))}

                {pendingManualCashExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No pending manual cash expenses.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="text-xl font-bold">Drawer History</h2>

          <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Holder</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>

              <tbody>
                {drawers.map((drawer) => (
                  <tr key={drawer.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3">{drawer.holder_name}</td>
                    <td className="px-4 py-3">{formatDateTime(drawer.opened_at)}</td>
                    <td className="px-4 py-3">{formatDateTime(drawer.closed_at)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(drawer.opening_float)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(drawer.expected_cash)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(drawer.actual_cash)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${Number(drawer.variance || 0) < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatMoney(drawer.variance)}</td>
                    <td className="px-4 py-3">{drawer.status}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => printDrawerReport(drawer)} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold hover:bg-blue-500">
                        Print PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showOpenDrawer && (
          <Modal title="Open Drawer" onClose={() => setShowOpenDrawer(false)}>
            <select value={drawerHolder} onChange={(e) => setDrawerHolder(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
              <option value="">Select drawer holder</option>
              {employees.map((employee) => (
                <option key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </select>

            <input type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="Opening float" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <textarea value={drawerRemarks} onChange={(e) => setDrawerRemarks(e.target.value)} rows={3} placeholder="Opening remarks" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <button onClick={openDrawer} disabled={isSaving} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
              {isSaving ? "Opening..." : "Open Drawer"}
            </button>
          </Modal>
        )}

        {showCloseDrawer && activeDrawer && (
          <Modal title="Close Drawer" onClose={() => setShowCloseDrawer(false)}>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-slate-300">Expected Drawer Cash</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-400">
                {formatMoney(activeDrawerCash)}
              </h3>
            </div>

            <input type="number" value={actualClosingCash} onChange={(e) => setActualClosingCash(e.target.value)} placeholder="Actual cash counted" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <textarea value={closeRemarks} onChange={(e) => setCloseRemarks(e.target.value)} rows={3} placeholder="Closing remarks / variance explanation" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

            <button onClick={closeDrawer} disabled={isSaving} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-500 disabled:opacity-50">
              {isSaving ? "Closing..." : "Close Drawer"}
            </button>
          </Modal>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">
            Close
          </button>
        </div>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}