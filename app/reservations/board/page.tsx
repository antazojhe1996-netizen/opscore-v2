import { supabase } from '@/lib/supabase';
"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Hotel,
  Plus,
  Search,
  Users,
  Wallet,
  BedDouble,
  LogIn,
  LogOut,
  Clock,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";

const dates = [
  { day: "Tue", date: "Jun 11" },
  { day: "Wed", date: "Jun 12" },
  { day: "Thu", date: "Jun 13" },
  { day: "Fri", date: "Jun 14" },
  { day: "Sat", date: "Jun 15" },
  { day: "Sun", date: "Jun 16" },
  { day: "Mon", date: "Jun 17" },
];

const rooms = [
  { room: "STR 108", type: "Standard Room", status: "available" },
  { room: "STR 118", type: "Standard Room", status: "occupied" },
  { room: "STR 207", type: "Standard Room", status: "occupied" },
  { room: "STR 209", type: "Standard Room", status: "available" },
  { room: "STR 210", type: "Standard Room", status: "available" },
  { room: "STR 211", type: "Standard Room", status: "occupied" },
  { room: "STR 212", type: "Standard Room", status: "maintenance" },
  { room: "STR 213", type: "Standard Room", status: "available" },
  { room: "DEL 101", type: "Deluxe Room", status: "occupied" },
  { room: "DEL 102", type: "Deluxe Room", status: "available" },
  { room: "DEL 103", type: "Deluxe Room", status: "occupied" },
  { room: "DEL 104", type: "Deluxe Room", status: "available" },
  { room: "DEL 105", type: "Deluxe Room", status: "occupied" },
  { room: "DEL 110", type: "Deluxe Room", status: "available" },
  { room: "PRE 117", type: "Premium Room", status: "occupied" },
  { room: "PRE 119", type: "Premium Room", status: "available" },
  { room: "PRE 201", type: "Premium Room", status: "occupied" },
  { room: "PRE 202", type: "Premium Room", status: "available" },
  { room: "FAM 206", type: "Family Room", status: "occupied" },
  { room: "FAM 222", type: "Family Room", status: "maintenance" },
];

const bookings = [
  { room: "STR 108", start: 0, span: 3, guest: "Juan Dela Cruz", code: "#RSV-250611-001", status: "checked-in" },
  { room: "STR 118", start: 1, span: 4, guest: "Maria Santos", code: "#RSV-250612-002", status: "confirmed" },
  { room: "STR 207", start: 2, span: 2, guest: "Walk-in Guest", code: "#PENDING", status: "pending" },
  { room: "STR 211", start: 0, span: 2, guest: "Robert Johnson", code: "#RSV-250611-003", status: "checked-in" },
  { room: "STR 212", start: 3, span: 4, guest: "Room Maintenance", code: "#BLOCKED", status: "maintenance" },
  { room: "DEL 101", start: 1, span: 3, guest: "Emily Clark", code: "#RSV-250612-004", status: "confirmed" },
  { room: "DEL 103", start: 4, span: 2, guest: "Corporate Booking", code: "#PENDING", status: "pending" },
  { room: "DEL 105", start: 0, span: 3, guest: "Booking.com Guest", code: "#RSV-250611-005", status: "checked-in" },
  { room: "PRE 117", start: 2, span: 4, guest: "The Smith Family", code: "#RSV-250613-006", status: "confirmed" },
  { room: "PRE 201", start: 3, span: 3, guest: "Agoda Guest", code: "#RSV-250614-007", status: "confirmed" },
  { room: "FAM 206", start: 1, span: 5, guest: "Long Stay Guest", code: "#RSV-250612-008", status: "checked-in" },
  { room: "FAM 222", start: 0, span: 7, guest: "Out of Service", code: "#MAINTENANCE", status: "maintenance" },
];

const recentReservations = [
  { guest: "Juan Dela Cruz", code: "#RSV-250611-001", status: "Checked In" },
  { guest: "Maria Santos", code: "#RSV-250612-002", status: "Confirmed" },
  { guest: "Walk-in Guest", code: "#PENDING", status: "Pending" },
  { guest: "Robert Johnson", code: "#RSV-250611-003", status: "Checked In" },
  { guest: "Emily Clark", code: "#RSV-250612-004", status: "Confirmed" },
];

export default function ReservationBoardPage() {
  const getBooking = (room: string) => bookings.find((b) => b.room === room);

  return (
    <PageGuard moduleKey="dashboard">
      <div className="flex min-h-screen bg-slate-100 text-slate-950">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/25">
                <CalendarDays size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Reservation Board
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Real-time overview of reservations and room availability.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm">
                <ChevronLeft size={18} />
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                Jun 11 - Jun 17, 2026
                <CalendarDays size={16} />
              </button>

              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm">
                <ChevronRight size={18} />
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                <Filter size={16} />
                Filters
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25">
                <Plus size={17} />
                New Reservation
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BedDouble size={22} />} title="Occupancy" value="72%" note="46 / 64 Rooms" />
            <Metric icon={<LogIn size={22} />} title="Check-ins" value="12" note="Today" />
            <Metric icon={<LogOut size={22} />} title="Check-outs" value="8" note="Today" />
            <Metric icon={<Wallet size={22} />} title="Revenue Today" value="â‚±189,450" note="Room Revenue" />
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none">
                    <option>All Room Types</option>
                    <option>Standard Room</option>
                    <option>Deluxe Room</option>
                    <option>Premium Room</option>
                    <option>Family Room</option>
                  </select>

                  <div className="flex min-w-[280px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Search size={16} className="text-slate-400" />
                    <input
                      placeholder="Search reservation, guest, or booking ID..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white shadow">
                    Timeline
                  </button>
                  <button className="rounded-xl px-5 py-2 text-xs font-black text-slate-500">
                    Calendar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1150px]">
                  <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-slate-100 bg-white">
                    <div className="border-r border-slate-100 p-4 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                      Room / Unit
                    </div>

                    {dates.map((date) => (
                      <div
                        key={date.date}
                        className="border-r border-slate-100 p-4 text-center"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          {date.day}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {date.date}
                        </p>
                      </div>
                    ))}
                  </div>

                  {rooms.map((room) => {
                    const booking = getBooking(room.room);

                    return (
                      <div
                        key={room.room}
                        className="grid min-h-[64px] grid-cols-[180px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-3 border-r border-slate-100 bg-slate-50/70 px-4">
                          <span className={`h-2.5 w-2.5 rounded-full ${getRoomDot(room.status)}`} />
                          <div>
                            <p className="text-sm font-black text-slate-900">{room.room}</p>
                            <p className="text-xs font-medium text-slate-400">{room.type}</p>
                          </div>
                        </div>

                        {dates.map((date, index) => {
                          const showBooking = booking && index === booking.start;

                          return (
                            <div
                              key={`${room.room}-${date.date}`}
                              className="relative border-r border-slate-100 bg-white p-2"
                            >
                              {showBooking && (
                                <div
                                  className={`absolute left-2 top-1/2 z-10 flex h-[42px] -translate-y-1/2 flex-col justify-center rounded-xl border px-4 text-xs font-black shadow-sm ${getBookingStyle(
                                    booking.status,
                                  )}`}
                                  style={{
                                    width: `calc(${booking.span * 100}% - 16px)`,
                                  }}
                                >
                                  <span className="truncate">{booking.guest}</span>
                                  <span className="truncate text-[10px] opacity-75">
                                    {booking.code}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 p-4 text-xs font-bold text-slate-500">
                <Legend label="Confirmed" className="bg-emerald-500" />
                <Legend label="Checked In" className="bg-blue-500" />
                <Legend label="Pending" className="bg-amber-400" />
                <Legend label="Maintenance" className="bg-red-400" />
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Today's Overview
                </h2>

                <div className="mt-4 space-y-3">
                  <SideStat icon={<LogIn size={16} />} label="Check-ins" value="12" />
                  <SideStat icon={<LogOut size={16} />} label="Check-outs" value="8" />
                  <SideStat icon={<Users size={16} />} label="In-house Guests" value="46" />
                  <SideStat icon={<Hotel size={16} />} label="Available Rooms" value="18" />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Recent Reservations
                </h2>

                <div className="mt-4 space-y-3">
                  {recentReservations.map((reservation, index) => (
                    <div key={reservation.code} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {reservation.guest}
                        </p>
                        <p className="truncate text-xs font-bold text-slate-400">
                          {reservation.code}
                        </p>
                      </div>

                      <span className={`text-xs font-black ${getStatusText(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/reservations/ledger"
                  className="mt-5 block rounded-2xl border border-slate-200 px-4 py-3 text-center text-xs font-black text-blue-600 hover:bg-blue-50"
                >
                  View All Reservations
                </Link>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Top Channels
                </h2>

                <div className="mt-5 space-y-3">
                  <Channel label="Direct" value="45%" />
                  <Channel label="Booking.com" value="30%" />
                  <Channel label="Walk-in" value="15%" />
                  <Channel label="Agoda" value="10%" />
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function Metric({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">{value}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  );
}

function SideStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="rounded-xl bg-blue-100 p-2 text-blue-600">{icon}</div>
      <span className="flex-1 text-sm font-bold text-slate-600">{label}</span>
      <span className="text-lg font-black text-slate-950">{value}</span>
    </div>
  );
}

function Channel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: value }} />
      </div>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </div>
  );
}

function getRoomDot(status: string) {
  if (status === "occupied") return "bg-emerald-500";
  if (status === "maintenance") return "bg-red-400";
  return "bg-slate-300";
}

function getBookingStyle(status: string) {
  if (status === "checked-in") {
    return "border-blue-300 bg-blue-100 text-blue-800";
  }

  if (status === "confirmed") {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (status === "pending") {
    return "border-amber-300 bg-amber-100 text-amber-800";
  }

  if (status === "maintenance") {
    return "border-red-300 bg-red-100 text-red-800";
  }

  return "border-blue-300 bg-blue-100 text-blue-800";
}

function getStatusText(status: string) {
  if (status === "Checked In") return "text-blue-600";
  if (status === "Confirmed") return "text-emerald-600";
  if (status === "Pending") return "text-amber-500";
  return "text-slate-500";
}


