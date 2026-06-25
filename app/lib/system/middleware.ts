import { NextResponse } from "next/server";

export function middleware(req: any) {
  const maintenance =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  const url = req.nextUrl.clone();

  const isMaintenancePage = url.pathname === "/maintenance";

  // allow maintenance page
  if (isMaintenancePage) return NextResponse.next();

  // allow static assets
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // BLOCK ALL ROUTES
  if (maintenance) {
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}


