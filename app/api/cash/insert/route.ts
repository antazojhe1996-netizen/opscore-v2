import { NextResponse } from "next/server";
import { insertCashMovement } from "@/lib/cash/cash-core";

/**
 * =========================
 * CASH INSERT ROUTE (FIXED)
 * =========================
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /**
     * ✅ FIX: ensure type is always passed
     * fallback to CASH_IN for safety
     */
    const result = await insertCashMovement(
      body,
      body?.type || "CASH_IN"
    );

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Cash movement failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}