import { NextResponse } from "next/server";


import { supabaseServer as supabase } from "@/lib/supabase-server";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const drawerId = searchParams.get("drawer_id");

  let query = supabase
    .from("cash_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (drawerId) {
    query = query.eq("drawer_id", drawerId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}





