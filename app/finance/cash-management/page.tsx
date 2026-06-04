"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function CashManagementPage() {
  /// STATES - DATABASE DATA
  const [movements, setMovements] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<any[]>([]);

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

  /// STATES - CASH EXPENSE DIRECT POSTING
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseDepartment, setExpenseDepartment] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseReleasedTo, setExpenseReleasedTo] = useState("");

  /// STATES - CASH ADVANCE DIRECT POSTING
  const [cashAdvanceEmployeeId, setCashAdvanceEmployeeId] = useState("");
  const [cashAdvancePurpose, setCashAdvancePurpose] = useState("");

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
    "Cash Advance",
    "Owner Withdrawal",
    "Bank Deposit",
    "Petty Cash",
    "Other",
  ];

  const paymentTypes = ["Cash", "GCash", "Bank", "Terminal"];

  const fallbackExpenseCategories = [
    "Food",
    "Beverages",
    "Housekeeping",
    "Maintenance",
    "Laundry",
    "Frontdesk",
    "Pool Maintenance",
    "Gas Vehicle/RFID",
    "Sanitary",
    "Employee Salary",
    "Cash Advance",
    "Supplies",
    "Other",
  ];

  const fallbackSubcategories: Record<string, string[]> = {
    Food: ["Market", "Grocery", "Kitchen Ingredients", "Staff Meal", "Other"],
    Beverages: ["Soft Drinks", "Beer", "Liquor", "Coffee", "Other"],
    Housekeeping: ["Laundry", "Linen", "Amenities", "Cleaning Supplies", "Other"],
    Maintenance: ["Aircon", "Electrical", "Plumbing", "Room Repair", "Tools", "Other"],
    Laundry: ["Guest Linen", "Staff Uniform", "Towels", "Other"],
    Frontdesk: ["Office Supplies", "Printing", "Guest Supplies", "Other"],
    "Pool Maintenance": ["Chemicals", "Cleaning", "Equipment", "Other"],
    "Gas Vehicle/RFID": ["Gasoline", "RFID", "Parking", "Vehicle Repair", "Other"],
    Sanitary: ["Garbage", "Pest Control", "Disinfection", "Other"],
    "Employee Salary": ["Salary Release", "Allowance", "Other"],
    Supplies: ["Office Supplies", "Hotel Supplies", "Kitchen Supplies", "Other"],
    Other: ["Other"],
  };

  const expenseDepartments = [
    "Front Office",
    "Housekeeping",
    "Maintenance",
    "Kitchen",
    "Restaurant",
    "Sports Bar",
    "Admin",
    "Payroll",
    "Operations",
    "Other",
  ];

  /// CALCULATIONS - ACTIVE DRAWER
  const activeDrawer = drawers.find((drawer) => drawer.status === "OPEN");

  const effectiveHolderFilter =
    holderFilter === "AUTO" ? activeDrawer?.holder_name || "ALL" : holderFilter;

  const isUuid = (value: any) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim()
    );

  const getEmployeePayrollId = (employee: any) => {
    const possibleIds = [
      employee?.id,
      employee?.employee_id,
      employee?.employee_uuid,
      employee?.profile_id,
      employee?.user_id,
    ];

    return String(possibleIds.find((value) => isUuid(value)) || "");
  };

  const getEmployeeFullName = (employee: any) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();

  const isCashAdvanceCashOut =
    movementType === "Cash Out" && paymentType === "Cash" && source === "Cash Advance";

  const isCashExpenseCashOut =
    movementType === "Cash Out" &&
    paymentType === "Cash" &&
    source === "Expense Release";

  const shouldCreateExpenseFromCashOut = isCashExpenseCashOut || isCashAdvanceCashOut;

  const selectedCashAdvanceEmployee = employees.find(
    (employee) => String(getEmployeePayrollId(employee)) === String(cashAdvanceEmployeeId)
  );

  const cashAdvanceEmployeeName = selectedCashAdvanceEmployee
    ? getEmployeeFullName(selectedCashAdvanceEmployee)
    : "";

  const getPayrollPeriodCoveringDate = (dateValue: string) => {
    if (!dateValue) return null;

    return (
      payrollPeriods.find(
        (period) =>
          String(period.start_date || "") <= dateValue &&
          String(period.end_date || "") >= dateValue
      ) || null
    );
  };

  const activePayrollPeriod = getPayrollPeriodCoveringDate(businessDate);

  const activePayrollLabel = activePayrollPeriod
    ? `${activePayrollPeriod.period_name || "Payroll Period"} (${activePayrollPeriod.start_date} to ${activePayrollPeriod.end_date})`
    : `No Draft/Reopened payroll period covers ${businessDate || "selected date"}`;

  const expenseCategoryOptions =
    expenseCategories.length > 0
      ? expenseCategories
          .map((category) => category.name || category.category_name || category.label)
          .filter(Boolean)
      : fallbackExpenseCategories;

  const selectedExpenseCategoryRecord = expenseCategories.find(
    (item) =>
      String(item.name || item.category_name || item.label || "") ===
      String(expenseCategory || "")
  );

  const databaseSubcategoryOptions = expenseSubcategories
    .filter((item) => {
      if (!expenseCategory) return false;

      if (item.category_id && selectedExpenseCategoryRecord?.id) {
        return String(item.category_id) === String(selectedExpenseCategoryRecord.id);
      }

      return String(item.category || "") === String(expenseCategory || "");
    })
    .map((item) => item.name || item.subcategory_name || item.label)
    .filter(Boolean);

  const expenseSubcategoryOptions =
    databaseSubcategoryOptions.length > 0
      ? databaseSubcategoryOptions
      : fallbackSubcategories[expenseCategory] || [];

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

  const activeDrawerCash = cashInTotal - cashOutTotal - remittanceTotal;
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
      console.log("GET CASH MOVEMENTS ERROR:", error.message);
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
      console.log("GET DRAWERS ERROR:", error.message);
      return;
    }

    setDrawers(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("payroll_active", true)
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const getPayrollPeriods = async () => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: true });

    if (error) {
      console.log("GET PAYROLL PERIODS ERROR:", error.message);
      setPayrollPeriods([]);
      return;
    }

    setPayrollPeriods(data || []);
  };

  const fetchPayrollPeriodForDate = async (dateValue: string) => {
    const { data, error } = await supabase
      .from("payroll_periods")
      .select("*")
      .lte("start_date", dateValue)
      .gte("end_date", dateValue)
      .in("status", ["Draft", "Reopened"])
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("FETCH PAYROLL PERIOD FOR DATE ERROR:", error.message);
      return null;
    }

    return data;
  };

  const getExpenseCategories = async () => {
    const { data: categoriesData, error: categoryError } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (!categoryError) {
      setExpenseCategories(categoriesData || []);
    } else {
      console.log("GET EXPENSE CATEGORIES ERROR:", categoryError.message);
      setExpenseCategories([]);
    }

    const { data: subcategoryData, error: subcategoryError } = await supabase
      .from("expense_subcategories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!subcategoryError) {
      setExpenseSubcategories(subcategoryData || []);
    } else {
      console.log("GET EXPENSE SUBCATEGORIES ERROR:", subcategoryError.message);
      setExpenseSubcategories([]);
    }
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
    setExpenseCategory("");
    setExpenseSubcategory("");
    setExpenseDepartment("");
    setExpenseDescription("");
    setExpenseReleasedTo("");
    setCashAdvanceEmployeeId("");
    setCashAdvancePurpose("");
  };

  const resetDrawerForm = () => {
    setDrawerHolder("");
    setOpeningFloat("");
    setDrawerRemarks("");
    setActualClosingCash("");
    setCloseRemarks("");
  };

  /// FUNCTIONS - PRINT REPORT
  const printDrawerReport = (drawer: any, customSummary?: any) => {
    const reportMovements = movements.filter(
      (item) => item.cash_drawer_id === drawer.id
    );

    const sum = (rows: any[]) =>
      rows.reduce((total, item) => total + Number(item.amount || 0), 0);

    const absSum = (rows: any[]) =>
      rows.reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

    const reportCashIn = sum(
      reportMovements.filter(
        (item) =>
          (item.payment_type || "Cash") === "Cash" &&
          (item.movement_type === "Opening Float" || item.movement_type === "Cash In")
      )
    );

    const reportCashOut = absSum(
      reportMovements.filter(
        (item) =>
          (item.payment_type || "Cash") === "Cash" && item.movement_type === "Cash Out"
      )
    );

    const reportRemittance = sum(
      reportMovements.filter(
        (item) =>
          (item.payment_type || "Cash") === "Cash" && item.movement_type === "Remittance"
      )
    );

    const expectedCash = Number(
      customSummary?.expected_cash ??
        drawer.expected_cash ??
        reportCashIn - reportCashOut - reportRemittance
    );

    const actualCash = Number(customSummary?.actual_cash ?? drawer.actual_cash ?? 0);
    const variance = Number(
      customSummary?.variance ?? drawer.variance ?? actualCash - expectedCash
    );

    const rows = reportMovements
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.business_date || "-"}</td>
            <td>${item.movement_type || "-"}</td>
            <td>${item.source || "-"}</td>
            <td>${item.payment_type || "Cash"}</td>
            <td>${item.from_person || "-"}</td>
            <td>${item.to_person || "-"}</td>
            <td class="amount">${formatMoney(item.amount)}</td>
            <td>${item.remarks || "-"}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Cash Drawer Report</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
            .print-btn { position: fixed; top: 12px; right: 12px; background: #111827; color: white; border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 800; }
            .page { padding: 24px; }
            .gold-line { height: 5px; background: #d4af37; margin-bottom: 16px; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { font-size: 24px; font-weight: 900; }
            .title { text-align: right; font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .muted { color: #6b7280; font-size: 11px; margin-top: 4px; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .card { border-left: 4px solid #d4af37; background: #f9fafb; padding: 10px; }
            .label { font-size: 9px; text-transform: uppercase; color: #6b7280; letter-spacing: .08em; }
            .value { font-size: 15px; font-weight: 900; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #111827; color: white; padding: 8px; text-align: left; text-transform: uppercase; font-size: 9px; }
            td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
            .amount { text-align: right; font-weight: 900; white-space: nowrap; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
          <section class="page">
            <div class="gold-line"></div>
            <div class="header">
              <div>
                <div class="brand">Vincent Resort Hotel</div>
                <div class="muted">Cash Drawer Report</div>
                <div class="muted">Generated: ${formatDateTime(new Date().toISOString())}</div>
              </div>
              <div>
                <div class="title">${customSummary?.status || drawer.status || "OPEN"}</div>
                <div class="muted">Holder: ${drawer.holder_name || "-"}</div>
                <div class="muted">Opened: ${formatDateTime(drawer.opened_at)}</div>
                <div class="muted">Closed: ${formatDateTime(customSummary?.closed_at || drawer.closed_at)}</div>
              </div>
            </div>
            <div class="cards">
              <div class="card"><div class="label">Cash In</div><div class="value">${formatMoney(reportCashIn)}</div></div>
              <div class="card"><div class="label">Cash Out</div><div class="value">${formatMoney(reportCashOut)}</div></div>
              <div class="card"><div class="label">Expected</div><div class="value">${formatMoney(expectedCash)}</div></div>
              <div class="card"><div class="label">Variance</div><div class="value">${formatMoney(variance)}</div></div>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Date</th><th>Type</th><th>Source</th><th>Payment</th><th>From</th><th>To</th><th>Amount</th><th>Remarks</th></tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="9" style="text-align:center; padding: 30px;">No movements found.</td></tr>`}</tbody>
            </table>
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
      console.log("OPEN DRAWER ERROR:", drawerError.message);
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
      console.log("OPEN DRAWER MOVEMENT ERROR:", movementError.message);
      alert("Drawer opened, but opening float movement failed.");
      return;
    }

    resetDrawerForm();
    setShowOpenDrawer(false);
    setHolderFilter("AUTO");
    await getDrawers();
    await getCashMovements();
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
      console.log("CLOSE DRAWER ERROR:", error.message);
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
    await getDrawers();
  };

  /// FUNCTIONS - SAVE CASH MOVEMENT
  const saveMovement = async () => {
    if (isSaving) return;

    if (!businessDate || !movementType || !source || !paymentType || !amount) {
      alert("Please complete date, type, source, payment type, and amount.");
      return;
    }

    const amountValue = Number(amount);

    if (amountValue <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (shouldCreateExpenseFromCashOut && !activeDrawer) {
      alert("Please open a drawer first before releasing a cash expense.");
      return;
    }

    if (isCashAdvanceCashOut && !cashAdvanceEmployeeId) {
      alert("Please select employee for cash advance.");
      return;
    }

    if (isCashAdvanceCashOut && !selectedCashAdvanceEmployee) {
      alert("Selected employee is invalid. Please re-select employee.");
      return;
    }

    const targetPayrollPeriod = isCashAdvanceCashOut
      ? await fetchPayrollPeriodForDate(businessDate)
      : null;

    if (isCashAdvanceCashOut && !targetPayrollPeriod) {
      alert(`No Draft/Reopened payroll period covers ${businessDate}. Create or reopen the correct cutoff first.`);
      return;
    }

    if (isCashExpenseCashOut && !expenseCategory) {
      alert("Please select expense category.");
      return;
    }

    if (isCashExpenseCashOut && expenseSubcategoryOptions.length > 0 && !expenseSubcategory) {
      alert("Please select expense subcategory.");
      return;
    }

    if (isCashExpenseCashOut && !expenseDepartment) {
      alert("Please select expense department / area.");
      return;
    }

    if (isCashExpenseCashOut && !expenseDescription.trim()) {
      alert("Please enter expense description.");
      return;
    }

    const autoFrom =
      paymentType === "Cash" && !fromPerson.trim()
        ? activeDrawer?.holder_name || ""
        : fromPerson.trim();

    const autoTo = isCashAdvanceCashOut
      ? cashAdvanceEmployeeName
      : isCashExpenseCashOut
      ? expenseReleasedTo.trim()
      : paymentType === "Cash" && !toPerson.trim()
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

    const movementRemarks = isCashAdvanceCashOut
      ? `Cash Advance - ${cashAdvanceEmployeeName}${
          cashAdvancePurpose.trim() ? ` - ${cashAdvancePurpose.trim()}` : ""
        }${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
      : isCashExpenseCashOut
      ? `${expenseDescription.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`
      : remarks.trim();

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: businessDate,
        movement_type: movementType,
        source,
        payment_type: paymentType,
        amount: amountValue,
        from_person: autoFrom,
        to_person: autoTo,
        encoded_by: autoEncoded,
        remarks: movementRemarks,
        reference_type: shouldCreateExpenseFromCashOut ? "expense" : null,
        reference_id: null,
        cash_drawer_id: activeDrawer?.id || null,
      })
      .select()
      .single();

    if (movementError) {
      setIsSaving(false);
      console.log("SAVE CASH MOVEMENT ERROR:", movementError.message);
      alert("Failed to save cash movement.");
      return;
    }

    if (shouldCreateExpenseFromCashOut) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          expense_date: businessDate,
          category: isCashAdvanceCashOut ? "Cash Advance" : expenseCategory,
          subcategory: isCashAdvanceCashOut
            ? "Cash Advance Release"
            : expenseSubcategory || null,
          department: isCashAdvanceCashOut ? "Payroll" : expenseDepartment,
          description: isCashAdvanceCashOut
            ? `Cash Advance - ${cashAdvanceEmployeeName}`
            : expenseDescription.trim(),
          amount: amountValue,
          payment_method: "Cash",
          employee_id: isCashAdvanceCashOut ? cashAdvanceEmployeeId : null,
          employee_name: isCashAdvanceCashOut ? cashAdvanceEmployeeName : null,
          deduct_to_payroll: isCashAdvanceCashOut,
          payroll_period_id: isCashAdvanceCashOut ? targetPayrollPeriod?.id || null : null,
          remarks: isCashAdvanceCashOut
            ? `Source: Cash Drawer. Auto linked by selected date to: ${
                targetPayrollPeriod
                  ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
                  : activePayrollLabel
              }. ${cashAdvancePurpose.trim()}${remarks.trim() ? ` - ${remarks.trim()}` : ""}`.trim()
            : `${remarks.trim()}${
                expenseReleasedTo.trim() ? ` Released to: ${expenseReleasedTo.trim()}` : ""
              }`.trim(),
          source: isCashAdvanceCashOut ? "Cash Drawer - Cash Advance" : "Cash Drawer",
          posted_to_cash_movements: true,
          cash_movement_id: movementData.id,
          cash_posted_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        setIsSaving(false);
        console.log("AUTO CREATE EXPENSE ERROR:", expenseError.message);
        alert("Cash movement was saved, but expense entry failed. Check expenses table columns.");
        await getCashMovements();
        return;
      }

      await supabase
        .from("finance_cash_movements")
        .update({ reference_id: expenseData.id })
        .eq("id", movementData.id);

      if (isCashAdvanceCashOut) {
        const cutoffLabel = targetPayrollPeriod
          ? `${targetPayrollPeriod.period_name || "Payroll Period"} (${targetPayrollPeriod.start_date} to ${targetPayrollPeriod.end_date})`
          : activePayrollLabel;

        const cashDrawerReference = [
          `Source: Cash Drawer`,
          `Cutoff: ${cutoffLabel}`,
          `Expense ID: ${expenseData.id}`,
          `Cash Movement ID: ${movementData.id}`,
          cashAdvancePurpose.trim() ? `Purpose: ${cashAdvancePurpose.trim()}` : "",
          remarks.trim() ? `Remarks: ${remarks.trim()}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        const { data: balanceData, error: balanceError } = await supabase
          .from("employee_balances")
          .insert({
            employee_id: cashAdvanceEmployeeId,
            employee_name: cashAdvanceEmployeeName,
            balance_type: "Cash Advance",
            original_amount: amountValue,
            remaining_balance: amountValue,
            status: "Active",
            source_module: "Cash Drawer",
            source_id: isUuid(movementData.id) ? movementData.id : null,
            period_id: targetPayrollPeriod.id,
            remarks: cashDrawerReference,
          })
          .select()
          .single();

        if (balanceError) {
          console.log("AUTO CREATE CASH ADVANCE BALANCE ERROR:", balanceError.message);
          alert("Cash advance saved to cash movement and expenses, but employee balance failed.");
        } else {
          await supabase
            .from("expenses")
            .update({ employee_balance_id: balanceData.id })
            .eq("id", expenseData.id);

          await supabase
            .from("payroll_periods")
            .update({ needs_regeneration: true })
            .eq("id", targetPayrollPeriod.id);
        }
      }
    }

    setIsSaving(false);
    resetForm();
    await getCashMovements();
    await getDrawers();

    if (isCashAdvanceCashOut) {
      alert("Cash advance saved to Cash Drawer, Expenses, and Payroll Balances.");
      return;
    }

    if (isCashExpenseCashOut) {
      alert("Cash expense saved to Cash Drawer and Expenses.");
      return;
    }

    alert("Cash movement saved.");
  };

  /// FUNCTIONS - DELETE MOVEMENT
  const deleteMovement = async (id: string) => {
    const { data: movement, error: movementFetchError } = await supabase
      .from("finance_cash_movements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (movementFetchError) {
      console.log("FETCH CASH MOVEMENT BEFORE DELETE ERROR:", movementFetchError.message);
      alert("Failed to check cash movement before delete.");
      return;
    }

    if (!movement) {
      alert("Cash movement not found.");
      await getCashMovements();
      return;
    }

    const { data: linkedExpenseByReference } = movement.reference_id
      ? await supabase
          .from("expenses")
          .select("*")
          .eq("id", movement.reference_id)
          .maybeSingle()
      : { data: null };

    const { data: linkedExpenseByMovement } = !linkedExpenseByReference
      ? await supabase
          .from("expenses")
          .select("*")
          .eq("cash_movement_id", id)
          .maybeSingle()
      : { data: null };

    const linkedExpense = linkedExpenseByReference || linkedExpenseByMovement;

    const confirmMessage = linkedExpense
      ? `Delete this cash movement and its linked expense?

This will remove:
• Cash Movement
• Expenses Ledger entry
${
  linkedExpense.employee_balance_id || movement.source === "Cash Advance"
    ? "• Employee Balance / Payroll deduction link"
    : ""
}

Continue?`
      : "Delete this cash movement?";

    const confirmDelete = confirm(confirmMessage);
    if (!confirmDelete) return;

    setIsSaving(true);

    if (linkedExpense) {
      if (linkedExpense.employee_balance_id) {
        const { error: balanceDeleteError } = await supabase
          .from("employee_balances")
          .delete()
          .eq("id", linkedExpense.employee_balance_id);

        if (balanceDeleteError) {
          setIsSaving(false);
          console.log("DELETE LINKED EMPLOYEE BALANCE ERROR:", balanceDeleteError.message);
          alert("Failed to delete linked employee balance.");
          return;
        }
      }

      // Safety fallback for older rows where employee_balance_id was not saved on expenses.
      await supabase
        .from("employee_balances")
        .delete()
        .eq("source_module", "Cash Drawer")
        .eq("source_id", id);

      const linkedPeriodId = linkedExpense.payroll_period_id || linkedExpense.period_id;

      const { error: expenseDeleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", linkedExpense.id);

      if (expenseDeleteError) {
        setIsSaving(false);
        console.log("DELETE LINKED EXPENSE ERROR:", expenseDeleteError.message);
        alert("Failed to delete linked expense entry.");
        return;
      }

      if (linkedPeriodId) {
        await supabase
          .from("payroll_periods")
          .update({ needs_regeneration: true })
          .eq("id", linkedPeriodId);
      }
    }

    const { error } = await supabase
      .from("finance_cash_movements")
      .delete()
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      console.log("DELETE CASH MOVEMENT ERROR:", error.message);
      alert("Linked records were checked, but failed to delete cash movement.");
      return;
    }

    await getCashMovements();
    await getDrawers();
    await getPayrollPeriods();

    alert(
      linkedExpense
        ? "Cash movement, linked expense, and payroll balance link were deleted."
        : "Cash movement deleted."
    );
  };

  /// EFFECTS
  useEffect(() => {
    getCashMovements();
    getDrawers();
    getEmployees();
    getPayrollPeriods();
    getExpenseCategories();
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
              Open drawer, track cash movement, release cash expenses, and post cash advances directly to payroll balances.
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
                Open a drawer first before releasing cash expenses or cash advances.
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

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard title="Cash In" value={formatMoney(cashInTotal)} color="text-blue-400" />
          <SummaryCard title="Cash Out" value={formatMoney(cashOutTotal)} color="text-red-400" />
          <SummaryCard title="Cash Remitted" value={formatMoney(remittanceTotal)} color="text-amber-400" />
        </section>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">Add Cash Movement</h2>

            <div className="mt-5 space-y-4">
              <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} style={{ colorScheme: "dark" }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value);
                  if (e.target.value !== "Cash Out") setSource("Room Sales");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {movementTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              >
                {sourceOptions.map((item) => <option key={item}>{item}</option>)}
              </select>

              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                {paymentTypes.map((item) => <option key={item}>{item}</option>)}
              </select>

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              {shouldCreateExpenseFromCashOut && (
                <div className={`rounded-2xl border p-4 ${
                  isCashAdvanceCashOut
                    ? "border-amber-500/20 bg-amber-500/10"
                    : "border-red-500/20 bg-red-500/10"
                }`}>
                  <p className={`mb-3 text-sm font-bold ${
                    isCashAdvanceCashOut ? "text-amber-300" : "text-red-300"
                  }`}>
                    {isCashAdvanceCashOut ? "Cash Advance Details" : "Cash Expense Details"}
                  </p>

                  {isCashAdvanceCashOut ? (
                    <div className="space-y-3">
                      <select
                        value={cashAdvanceEmployeeId}
                        onChange={(e) => setCashAdvanceEmployeeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select employee</option>
                        {employees.map((employee) => {
                          const payrollEmployeeId = getEmployeePayrollId(employee);

                          return (
                            <option
                              key={payrollEmployeeId || employee.id || employee.employee_no}
                              value={payrollEmployeeId}
                              disabled={!payrollEmployeeId}
                            >
                              {getEmployeeFullName(employee)}
                              {employee.employee_no ? ` - ${employee.employee_no}` : ""}
                              {!payrollEmployeeId ? " (No payroll UUID)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      <div className={`rounded-xl border p-3 ${
                        activePayrollPeriod
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-red-500/30 bg-red-500/10"
                      }`}>
                        <p className={`text-xs font-black ${
                          activePayrollPeriod ? "text-emerald-300" : "text-red-300"
                        }`}>
                          {activePayrollPeriod
                            ? "✓ Auto Linked by Selected Date"
                            : "⚠ No Payroll Period for Selected Date"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          {activePayrollPeriod
                            ? activePayrollLabel
                            : "Create or reopen the cutoff that covers the selected date. No manual cutoff selection needed here."}
                        </p>
                      </div>

                      <input
                        value={cashAdvancePurpose}
                        onChange={(e) => setCashAdvancePurpose(e.target.value)}
                        placeholder="Purpose / reason (optional)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      />

                      <p className="text-xs leading-5 text-amber-200">
                        No cutoff selection needed. This posts to Cash Drawer, Expenses, and Employee Balances for Payroll Register deduction.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={expenseCategory}
                        onChange={(e) => {
                          setExpenseCategory(e.target.value);
                          setExpenseSubcategory("");
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select expense category</option>
                        {expenseCategoryOptions.map((item) => <option key={item}>{item}</option>)}
                      </select>

                      {expenseSubcategoryOptions.length > 0 && (
                        <select
                          value={expenseSubcategory}
                          onChange={(e) => setExpenseSubcategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
                        >
                          <option value="">Select expense subcategory</option>
                          {expenseSubcategoryOptions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      )}

                      <select value={expenseDepartment} onChange={(e) => setExpenseDepartment(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                        <option value="">Select department / area</option>
                        {expenseDepartments.map((item) => <option key={item}>{item}</option>)}
                      </select>

                      <input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="Expense description / purpose" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

                      <input value={expenseReleasedTo} onChange={(e) => setExpenseReleasedTo(e.target.value)} placeholder="Released to / received by" list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

                      <p className="text-xs leading-5 text-red-200">
                        This creates both Cash Movement and Expenses entry. No approval workflow.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!shouldCreateExpenseFromCashOut && (movementType === "Cash Out" || movementType === "Remittance" || movementType === "Adjustment") && (
                <input value={fromPerson} onChange={(e) => setFromPerson(e.target.value)} placeholder={activeDrawer ? `From: ${activeDrawer.holder_name}` : "From / Released by"} list="employee-list" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
              )}

              {!shouldCreateExpenseFromCashOut && (movementType === "Opening Float" || movementType === "Cash In" || movementType === "Remittance" || movementType === "Adjustment") && (
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
                {isSaving ? "Saving..." : isCashAdvanceCashOut ? "Save Cash Advance" : isCashExpenseCashOut ? "Save Cash Expense" : "Save Cash Movement"}
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

                {drawers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">No drawer history found.</td>
                  </tr>
                )}
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
