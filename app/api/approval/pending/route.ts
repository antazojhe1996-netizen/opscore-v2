import { NextResponse } from "next/server";


import { supabaseServer as supabase } from "@/lib/supabase-server";
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("status", "PENDING")
      .eq("module", "CASH")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}





