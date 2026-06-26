import { NextResponse } from "next/server";
import { insertCashMovement } from "@/lib/cash/cash-core";

/**
 * =========================
 * CASH INSERT ROUTE V3
 * =========================
 * Gateway only.
 *
 * Request
 *   ↓
 * cash-core.ts
 *   ↓
 * cash-engine.ts
 *
 * No direct Supabase logic here.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await insertCashMovement(
      body,
      body?.type || body?.movement_type || "CASH_IN",
    );

    if (result.success === false) {
  return NextResponse.json(
    {
      success: false,
      error: result.error,
      normalized: result.normalized || null,
    },
    { status: 400 },
  );
}

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        normalized: result.normalized,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}