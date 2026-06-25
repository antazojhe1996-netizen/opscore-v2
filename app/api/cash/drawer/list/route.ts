import { NextResponse } from "next/server";
import { getOpenCashDrawers } from "@/lib/cash/drawer-core";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Missing company_id" },
        { status: 400 }
      );
    }

    if (!getOpenCashDrawers) {
      throw new Error("drawer-core export missing");
    }

    const result = await getOpenCashDrawers(companyId);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}