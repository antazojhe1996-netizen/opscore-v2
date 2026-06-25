import { supabase } from '@/lib/supabase';
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      userId,
      userName,
      module,
      action,
      description,
      severity = "info",
      recordId,
      oldValue,
      newValue,
    } = body;

    const { error } = await supabaseServer
      .from("audit_logs")
      .insert({
        user_id: userId ?? null,
        user_name: userName ?? null,
        module,
        action,
        description,
        severity,
        record_id: recordId ?? null,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
      });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}