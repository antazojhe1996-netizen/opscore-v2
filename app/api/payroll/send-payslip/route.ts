import { NextResponse } from "next/server";
import { Resend } from "resend";


const money = (value: any) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

console.log("RESEND_API_KEY EXISTS:", Boolean(apiKey));
console.log("PAYSLIP_FROM_EMAIL:", process.env.PAYSLIP_FROM_EMAIL);

if (!apiKey) {
  return NextResponse.json(
    { error: "RESEND_API_KEY is missing from .env.local. Restart npm run dev after saving." },
    { status: 500 }
  );
}

const resend = new Resend(apiKey);

    const { employeeEmail, period, record } = await request.json();

    if (!employeeEmail) {
      return NextResponse.json(
        { error: "Missing employee email." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: process.env.PAYSLIP_FROM_EMAIL || "onboarding@resend.dev",
      to: employeeEmail,
      subject: `Payslip - ${period?.period_name || "Payroll Period"}`,
      html: `
        <h2>Vincent Resort Hotel - Payslip</h2>

        <p><b>Employee:</b> ${record.employee_name}</p>
        <p><b>Period:</b> ${period?.period_name || "-"}</p>

        <hr />

        <p><b>Gross Pay:</b> ${money(record.gross_pay)}</p>
        <p><b>Deductions:</b> ${money(record.total_deductions)}</p>

        <h2>Net Pay: ${money(record.net_pay)}</h2>

        <p>This is a system-generated payslip.</p>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("SEND PAYSLIP ERROR:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to send payslip.",
      },
      {
        status: 500,
      }
    );
  }
}




