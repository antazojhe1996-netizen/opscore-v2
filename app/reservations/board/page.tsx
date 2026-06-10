"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Plus,
  Search,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";

const dates = ["Jun 11", "Jun 12", "Jun 13", "Jun 14", "Jun 15", "Jun 16", "Jun 17"];

const rooms = [
  { room: "STR 108", type: "Standard Room" },
  { room: "STR 118", type: "Standard Room" },
  { room: "STR 207", type: "Standard Room" },
  { room: "STR 209", type: "Standard Room" },
  { room: "DEL 105", type: "Deluxe Room" },
  { room: "DEL 110", type: "Deluxe Room" },
  { room: "PRE 201", type: "Premium Room" },
  { room: "FAM 206", type: "Family Room" },
];

const bookings = [
  { room: "STR 108", start: 0, span: 3, guest: "John Smith", status: "checked-in" },
  { room: "STR 118", start: 1, span: 2, guest: "Maria Cruz", status: "reserved" },
  { room: "STR 207", start: 2, span: 4, guest: "David Lee", status: "arriving" },
  { room: "DEL 105", start: 0, span: 2, guest: "Booking.com", status: "reserved" },
  { room: "PRE 201", start: 3, span: 3, guest: "Walk In", status: "checked-in" },
  { room: "FAM 206", start: 4, span: 2, guest: "Maintenance", status: "maintenance" },
];

export default function ReservationBoardPage() {
  const getBooking = (room: string) => bookings.find((b) => b.room === room);

  return (
    <PageGuard moduleKey="dashboard">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <section className="mb-5 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Reservations
                </p>
                <h1 className="mt-2 text-3xl font-black">
                  Reservation Board
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Cloud-style room timeline for arrivals, departures, occupancy, and room activity.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/reservations"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-black text-slate-300 hover:bg-slate-800"
                >
                  Back Dashboard
                </Link>

                <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500">
                  <Plus size={16} />
                  New Reservation
                </button>
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Metric title="Occupancy" value="82%" />
            <Metric title="Available Rooms" value="18" />
            <Metric title="Arrivals Today" value="12" />
            <Metric title="Departures Today" value="8" />
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300">
                  <ChevronLeft size={18} />
                </button>

                <button className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200">
                  <CalendarDays size={16} />
                  Jun 11 - Jun 17
                </button>

                <button className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300">
                  <ChevronRight size={18} />
                </button>

                <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                <Search size={16} className="text-slate-500" />
                <input
                  placeholder="Search guest or room..."
                  className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-slate-800 bg-slate-950">
                  <div className="border-r border-slate-800 p-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Room
                  </div>

                  {dates.map((date) => (
                    <div
                      key={date}
                      className="border-r border-slate-800 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400"
                    >
                      {date}
                    </div>
                  ))}
                </div>

                {rooms.map((room) => {
                  const booking = getBooking(room.room);

                  return (
                    <div
                      key={room.room}
                      className="grid min-h-[74px] grid-cols-[220px_repeat(7,1fr)] border-b border-slate-800"
                    >
                      <div className="flex items-center gap-3 border-r border-slate-800 bg-slate-950/60 p-4">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-300">
                          <Hotel size={16} />
                        </div>
                        <div>
                          <p className="font-black text-white">{room.room}</p>
                          <p className="text-xs text-slate-500">{room.type}</p>
                        </div>
                      </div>

                      {dates.map((date, index) => {
                        const showBooking = booking && index === booking.start;
                        const covered =
                          booking &&
                          index > booking.start &&
                          index < booking.start + booking.span;

                        return (
                          <div
                            key={`${room.room}-${date}`}
                            className="relative border-r border-slate-800 bg-slate-900 p-2"
                          >
                            {showBooking && (
                              <div
                                className={`absolute left-2 top-1/2 z-10 flex h-10 -translate-y-1/2 items-center rounded-xl px-4 text-xs font-black shadow-lg ${getBookingStyle(
                                  booking.status,
                                )}`}
                                style={{
                                  width: `calc(${booking.span * 100}% - 16px)`,
                                }}
                              >
                                {booking.guest}
                              </div>
                            )}

                            {covered && (
                              <div className="absolute inset-0 bg-blue-500/[0.03]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-800 p-4 text-xs">
              <Legend label="Reserved" className="bg-blue-600" />
              <Legend label="Checked In" className="bg-emerald-600" />
              <Legend label="Arriving Today" className="bg-amber-500" />
              <Legend label="Maintenance" className="bg-red-600" />
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function getBookingStyle(status: string) {
  if (status === "checked-in") return "bg-emerald-600 text-white";
  if (status === "arriving") return "bg-amber-500 text-slate-950";
  if (status === "maintenance") return "bg-red-600 text-white";
  return "bg-blue-600 text-white";
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-2 text-3xl font-black text-white">{value}</h2>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </div>
  );
}