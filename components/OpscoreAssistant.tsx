"use client";

import { Bot } from "lucide-react";

type OpscoreReminder = {
  type?: string;
  tone?: string;
  text: string;
};

export default function OpscoreAssistant({
  reminders = [],
}: {
  reminders: OpscoreReminder[];
}) {
  const visibleReminders = reminders.slice(0, 5);
  const hasReminders = visibleReminders.length > 0;
  const hasCritical = visibleReminders.some(
    (item) => item.type === "critical" || item.type === "danger" || item.tone === "danger",
  );

  const getReminderClass = (reminder: OpscoreReminder) => {
    const level = reminder.type || reminder.tone || "neutral";

    if (level === "critical" || level === "danger")
      return "border-red-200 bg-red-50 text-red-700";
    if (level === "warning")
      return "border-amber-200 bg-amber-50 text-amber-700";
    if (level === "info") return "border-blue-200 bg-blue-50 text-blue-700";
    if (level === "success")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  return (
    <div className="group fixed bottom-6 right-6 z-40">
      {hasReminders && (
        <div className="absolute bottom-14 right-0 hidden w-[340px] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl group-hover:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            OPSCORE ASSISTANT
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Operational Reminders
          </h3>

          <div className="mt-3 space-y-2">
            {visibleReminders.map((reminder, index) => (
              <div
                key={`${reminder.text}-${index}`}
                className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${getReminderClass(
                  reminder,
                )}`}
              >
                {reminder.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="OPSCORE reminders"
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
      >
        <Bot size={22} />

        {hasReminders && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 ${
                hasCritical ? "animate-ping" : "animate-pulse"
              }`}
            />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600" />
          </span>
        )}
      </button>
    </div>
  );
}