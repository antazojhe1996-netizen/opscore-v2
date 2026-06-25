import { NextResponse } from "next/server";
import { closeCashDrawer } from "@/lib/cash/drawer-core";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await closeCashDrawer(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


