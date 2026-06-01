"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function EventAddonsPage() {
  /// STATES
  const [events, setEvents] = useState<any[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [expectedPax, setExpectedPax] = useState("");
  const [remarks, setRemarks] = useState("");
  

  /// FUNCTIONS
  const getEvents = async () => {
    const { data, error } = await supabase
      .from("event_addons")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.log("GET EVENTS ERROR:", error.message);
      return;
    }

    setEvents(data || []);
  };

  const addEvent = async () => {
    if (!eventDate || !eventName.trim()) {
      alert("Please enter event date and event name.");
      return;
    }

    const { error } = await supabase.from("event_addons").insert({
      event_date: eventDate,
      event_name: eventName,
      expected_pax: Number(expectedPax || 0),
      remarks,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.log("ADD EVENT ERROR:", error.message);
      alert("Failed to save event.");
      return;
    }

    setEventDate("");
    setEventName("");
    setExpectedPax("");
    setRemarks("");

    getEvents();
  };

  const deleteEvent = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("event_addons")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE EVENT ERROR:", error.message);
      alert("Failed to delete event.");
      return;
    }

    getEvents();
  };

  /// EFFECTS
  useEffect(() => {
    getEvents();
  }, []);

  /// CALCULATIONS
  const totalEvents = events.length;

  const totalExpectedPax = events.reduce(
    (sum, event) => sum + Number(event.expected_pax || 0),
    0
  );

  const upcomingEvents = events.filter((event) => {
    const today = new Date().toISOString().slice(0, 10);
    return String(event.event_date) >= today;
  });

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Event Add-ons</h1>
          <p className="mt-2 text-slate-400">
            Add date-based events that increase required headcount in forecasting.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Events</p>
            <h2 className="mt-2 text-3xl font-bold">{totalEvents}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Upcoming Events</p>
            <h2 className="mt-2 text-3xl font-bold">{upcomingEvents.length}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Expected Pax</p>
            <h2 className="mt-2 text-3xl font-bold">{totalExpectedPax}</h2>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">Add Event</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Event Name
              </label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Wedding, Birthday, Company outing..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Expected Pax
              </label>
              <input
                type="number"
                value={expectedPax}
                onChange={(e) => setExpectedPax(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Remarks
              </label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            onClick={addEvent}
            className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-300"
          >
            Save Event
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Event List</h2>
            <p className="text-sm text-slate-400">
              These events will be used later by Forecasting to add event-based HC.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Event Name</th>
                  <th className="p-4">Expected Pax</th>
                  <th className="p-4">Remarks</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t border-slate-800 text-slate-200"
                  >
                    <td className="p-4">{event.event_date}</td>
                    <td className="p-4 font-semibold">{event.event_name}</td>
                    <td className="p-4">{event.expected_pax}</td>
                    <td className="p-4">{event.remarks || "-"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No events added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}