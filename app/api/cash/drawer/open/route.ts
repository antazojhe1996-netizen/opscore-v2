import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * SERVER SUPABASE CLIENT
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { company_id, holder_name, opening_float } = await req.json();

    if (!company_id || !holder_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing company_id or holder_name",
        },
        { status: 400 }
      );
    }

    // =========================
    // STEP 1: CHECK EXISTING OPEN DRAWER
    // =========================
    const { data: existing, error: checkError } = await supabase
      .from("cash_drawers")
      .select("id, holder_name, status, opened_at")
      .eq("company_id", company_id)
      .eq("status", "OPEN");

    if (checkError) {
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "There is already an OPEN drawer",
          data: existing[0],
        },
        { status: 400 }
      );
    }

    // =========================
    // STEP 2: CREATE DRAWER
    // =========================
    const { data, error } = await supabase
      .from("cash_drawers")
      .insert({
        company_id,
        holder_name,
        opening_float: Number(opening_float || 0),
        status: "OPEN",
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // =========================
    // STEP 3: RETURN
    // =========================
    return NextResponse.json({
      success: true,
      data,
    });

  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Server error",
      },
      { status: 500 }
    );
  }
}