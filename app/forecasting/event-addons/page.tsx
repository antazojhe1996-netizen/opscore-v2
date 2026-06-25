import { supabase } from '@/lib/supabase';
"use client";


"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
type EventAddon = {
  id: string;
  event_date: string;
  event_name: string;
  expected_pax: number | null;
  remarks: string | null;
  created_at?: string | null;
};

type CurrentUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

type AuditSeverity = "info" | "warning" | "critical";

const MODULE_NAME = "Event Add-ons";

export default function EventAddonsPage() {
  /// STATES
  const [events, setEvents] = useState<EventAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [expectedPax, setExpectedPax] = useState("");
  const [remarks, setRemarks] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  /// CALCULATIONS
  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return events;

    return events.filter((event) => {
      return (
        event.event_name?.toLowerCase().includes(term) ||
        event.event_date?.toLowerCase().includes(term) ||
        event.remarks?.toLowerCase().includes(term)
      );
    });
  }, [events, searchTerm]);

  const isEditing = Boolean(editingId);

  /// FUNCTIONS
  const getCurrentUser = async (): Promise<CurrentUser> => {
    const localUser =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_user")
        : null;

    if (localUser) {
      try {
        const parsedUser = JSON.parse(localUser);

        return {
          id: parsedUser?.id || null,
          name:
            parsedUser?.name ||
            parsedUser?.full_name ||
            parsedUser?.user_name ||
            parsedUser?.email ||
            "Unknown User",
          email: parsedUser?.email || null,
        };
      } catch {
        // Continue to Supabase auth fallback.
      }
    }

    const { data } = await supabase.auth.getUser();

    return {
      id: data?.user?.id || null,
      name:
        data?.user?.user_metadata?.full_name ||
        data?.user?.email ||
        "Unknown User",
      email: data?.user?.email || null,
    };
  };

  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    recordId = null,
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: AuditSeverity;
    recordId?: string | null;
    oldValue?: any;
    newValue?: any;
  }) => {
    const currentUser = await getCurrentUser();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      module: MODULE_NAME,
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
    });

    if (error) {
      console.log("AUDIT LOG ERROR:", error.message);
    }
  };

  const resetForm = () => {
    setEventDate("");
    setEventName("");
    setExpectedPax("");
    setRemarks("");
    setEditingId(null);
  };

  const getEvents = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("event_addons")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.log("GET EVENT ADD-ONS ERROR:", error.message);
      setLoading(false);
      return;
    }

    setEvents((data || []) as EventAddon[]);
    setLoading(false);
  };

  const saveEvent = async () => {
    const cleanEventName = eventName.trim();
    const cleanRemarks = remarks.trim();
    const paxNumber =
      expectedPax.trim() === "" ? null : Number(expectedPax.trim());

    if (!eventDate || !cleanEventName) {
      alert("Please enter event date and event name.");
      return;
    }

    if (expectedPax.trim() !== "" && Number.isNaN(paxNumber)) {
      alert("Expected pax must be a valid number.");
      return;
    }

    setSaving(true);

    const payload = {
      event_date: eventDate,
      event_name: cleanEventName,
      expected_pax: paxNumber,
      remarks: cleanRemarks || null,
    };

    if (editingId) {
      const oldValue = events.find((event) => event.id === editingId) || null;

      const { data, error } = await supabase
        .from("event_addons")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();

      if (error) {
        console.log("UPDATE EVENT ADD-ON ERROR:", error.message);
        alert("Unable to update event add-on.");
        setSaving(false);
        return;
      }

      await createAuditLog({
        action: "UPDATE_EVENT_ADDON",
        description: `Updated event add-on: ${cleanEventName}`,
        severity: "warning",
        recordId: editingId,
        oldValue,
        newValue: data,
      });

      resetForm();
      await getEvents();
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("event_addons")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.log("CREATE EVENT ADD-ON ERROR:", error.message);
      alert("Unable to create event add-on.");
      setSaving(false);
      return;
    }

    await createAuditLog({
      action: "CREATE_EVENT_ADDON",
      description: `Created event add-on: ${cleanEventName}`,
      severity: "info",
      recordId: data?.id || null,
      oldValue: null,
      newValue: data,
    });

    resetForm();
    await getEvents();
    setSaving(false);
  };

  const startEdit = (event: EventAddon) => {
    setEditingId(event.id);
    setEventDate(event.event_date || "");
    setEventName(event.event_name || "");
    setExpectedPax(
      event.expected_pax === null || event.expected_pax === undefined
        ? ""
        : String(event.expected_pax)
    );
    setRemarks(event.remarks || "");
  };

  const deleteEvent = async (event: EventAddon) => {
    const confirmed = confirm(
      `Delete event add-on "${event.event_name}"? This action will be audited.`
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase
      .from("event_addons")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.log("DELETE EVENT ADD-ON ERROR:", error.message);
      alert("Unable to delete event add-on.");
      setSaving(false);
      return;
    }

    await createAuditLog({
      action: "DELETE_EVENT_ADDON",
      description: `Deleted event add-on: ${event.event_name}`,
      severity: "critical",
      recordId: event.id,
      oldValue: event,
      newValue: null,
    });

    if (editingId === event.id) resetForm();

    await getEvents();
    setSaving(false);
  };

  useEffect(() => {
    getEvents();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Settings
          </p>

          <h1 className="mt-2 text-4xl font-black">Event Add-ons</h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Manage event-based headcount add-ons used for forecasting and
            scheduling. Create, update, and delete actions are recorded in the
            audit trail.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  {isEditing ? "Edit Event Add-on" : "Add Event Add-on"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add expected event demand so OPSCORE can include it in
                  deployment planning.
                </p>
              </div>

              {isEditing && (
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Event Date
                </span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Event Name
                </span>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Example: Birthday Event, Company Outing"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Expected Pax
                </span>
                <input
                  type="number"
                  min="0"
                  value={expectedPax}
                  onChange={(e) => setExpectedPax(e.target.value)}
                  placeholder="Example: 80"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Remarks
                </span>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes for operations planning"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400"
                />
              </label>

              <button
                onClick={saveEvent}
                disabled={saving}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Event Add-on"
                    : "Create Event Add-on"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Event Add-on List</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredEvents.length} record
                  {filteredEvents.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event, date, or remarks..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400 lg:max-w-sm"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Expected Pax</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-slate-400"
                        >
                          Loading event add-ons...
                        </td>
                      </tr>
                    ) : filteredEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-slate-400"
                        >
                          No event add-ons found.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-200">
                            {event.event_date}
                          </td>

                          <td className="px-4 py-4 font-bold text-white">
                            {event.event_name}
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {event.expected_pax ?? "-"}
                          </td>

                          <td className="max-w-sm px-4 py-4 text-slate-400">
                            {event.remarks || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(event)}
                                disabled={saving}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deleteEvent(event)}
                                disabled={saving}
                                className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Audit actions covered: CREATE_EVENT_ADDON, UPDATE_EVENT_ADDON,
              DELETE_EVENT_ADDON.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}





