export type CashLedgerMovement = {
  id?: string;
  cash_drawer_id?: string | null;
  business_date?: string | null;
  movement_type?: string | null;
  source?: string | null;
  payment_type?: string | null;
  amount?: number | string | null;
  status?: string | null;
  movement_status?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
};

export type DrawerLedgerSummary = {
  drawerId: string;
  movements: CashLedgerMovement[];

  openingFloat: number;
  cashIn: number;
  cashOut: number;
  remittance: number;
  turnoverOut: number;
  turnoverIn: number;
  expectedCash: number;

  gcash: number;
  bank: number;
  terminal: number;
  onlineBanking: number;
};

const normalize = (value: any) =>
  String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const money = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isActiveCashMovement = (movement: CashLedgerMovement) => {
  const status = normalize(movement.status || movement.movement_status || "ACTIVE");
  return (
    status === "active" &&
    !movement.voided_at &&
    !movement.void_reason
  );
};

export const isDrawerTurnoverIn = (movement: CashLedgerMovement) =>
  normalize(movement.movement_type) === "cash in" &&
  normalize(movement.source).includes("drawer turnover");

export const isDrawerTurnoverOut = (movement: CashLedgerMovement) =>
  normalize(movement.movement_type) === "turnover" ||
  normalize(movement.source) === "drawer turnover";

export const getSignedLedgerAmount = (movement: CashLedgerMovement) => {
  const amount = Math.abs(money(movement.amount));
  const type = normalize(movement.movement_type);

  if (type === "cash out") return -amount;
  if (type === "remittance") return -amount;
  if (type === "turnover") return -amount;

  return amount;
};

export function calculateDrawerLedgerSummary(
  drawerId: string | null | undefined,
  movements: CashLedgerMovement[],
): DrawerLedgerSummary {
  const id = String(drawerId || "");

  const rows = (movements || []).filter(
    (movement) =>
      String(movement.cash_drawer_id || "") === id &&
      isActiveCashMovement(movement),
  );

  const cashRows = rows.filter((movement) => normalize(movement.payment_type || "Cash") === "cash");
  const gcashRows = rows.filter((movement) => normalize(movement.payment_type) === "gcash");
  const bankRows = rows.filter((movement) => normalize(movement.payment_type) === "bank");
  const terminalRows = rows.filter((movement) => normalize(movement.payment_type) === "terminal");

  const openingFloat = cashRows
    .filter((movement) => normalize(movement.movement_type) === "opening float")
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const cashIn = cashRows
    .filter(
      (movement) =>
        normalize(movement.movement_type) === "cash in" &&
        !isDrawerTurnoverIn(movement),
    )
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const turnoverIn = cashRows
    .filter(isDrawerTurnoverIn)
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const cashOut = cashRows
    .filter((movement) => normalize(movement.movement_type) === "cash out")
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const remittance = cashRows
    .filter((movement) => normalize(movement.movement_type) === "remittance")
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const turnoverOut = cashRows
    .filter(isDrawerTurnoverOut)
    .reduce((sum, movement) => sum + Math.abs(money(movement.amount)), 0);

  const expectedCash =
    openingFloat +
    cashIn +
    turnoverIn -
    cashOut -
    remittance -
    turnoverOut;

  const sumSigned = (items: CashLedgerMovement[]) =>
    items.reduce((sum, movement) => sum + getSignedLedgerAmount(movement), 0);

  const gcash = sumSigned(gcashRows);
  const bank = sumSigned(bankRows);
  const terminal = sumSigned(terminalRows);

  return {
    drawerId: id,
    movements: rows,

    openingFloat,
    cashIn,
    cashOut,
    remittance,
    turnoverOut,
    turnoverIn,
    expectedCash,

    gcash,
    bank,
    terminal,
    onlineBanking: gcash + bank + terminal,
  };
}