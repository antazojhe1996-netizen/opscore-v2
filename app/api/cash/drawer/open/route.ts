import { NextResponse } from "next/server";
import { openCashDrawer } from "@/lib/cash/drawer-core";

/**
 * =========================
 * OPEN CASH DRAWER ROUTE V3
 * =========================
 * Gateway only.
 *
 * Request
 *   ↓
 * drawer-core.ts
 *   ↓
 * cash_drawers
 *
 * No direct Supabase logic here.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await openCashDrawer(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Server error",
      },
      { status: 500 },
    );
  }
}