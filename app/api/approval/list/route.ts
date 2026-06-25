import { supabase } from '@/lib/supabase';
import { NextResponse } from "next/server";


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("status", status)
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
}





