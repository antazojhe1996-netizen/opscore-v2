"use client";

import { Bot } from "lucide-react";

type ReminderStatus =
  | "critical"
  | "warning"
  | "info"
  | "success"
  | "neutral";

type Reminder = {
  status?: ReminderStatus | string;
  type?: ReminderStatus | string;
  priority?: ReminderStatus | string;
  tone?: ReminderStatus | string;
  text?: string;
  message?: string;
  label?: string;
};

const STATUS_ORDER: Record<ReminderStatus, number> = {
  critical: 1,
  warning: 2,
  info: 3,
  success: 4,
  neutral: 5,
};

function normalizeReminderStatus(value: unknown): ReminderStatus {
  const raw = String(value || "").trim().toLowerCase();

  if (
    raw === "critical" ||
    raw === "danger" ||
    raw === "error" ||
    raw === "red"
  ) {
    return "critical";
  }

  if (
    raw === "warning" ||
    raw === "pending" ||
    raw === "amber" ||
    raw === "yellow"
  ) {
    return "warning";
  }

  if (
    raw === "info" ||
    raw === "information" ||
    raw === "blue"
  ) {
    return "info";
  }

  if (
    raw === "success" ||
    raw === "approved" ||
    raw === "open" ||
    raw === "active" ||
    raw === "green" ||
    raw === "emerald"
  ) {
    return "success";
  }

  return "neutral";
}

export default function OpscoreAssistant({
  reminders = [],
}: {
  reminders?: Reminder[];
}) {
  const normalizedReminders = reminders
    .map((item) => {
      const status = normalizeReminderStatus(
        item.status || item.priority || item.type || item.tone || "neutral",
      );

      const text = String(item.text || item.message || item.label || "").trim();

      return {
        status,
        text,
      };
    })
    .filter((item) => item.text)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .slice(0, 5);

  const hasCritical = normalizedReminders.some(
    (item) => item.status === "critical",
  );

  const hasWarning = normalizedReminders.some(
    (item) => item.status === "warning",
  );

  const hasAlert = normalizedReminders.length > 0;

  const dotClass = hasCritical
    ? "bg-red-600"
    : hasWarning
      ? "bg-amber-500"
      : "bg-blue-600";

  return (
    <div className="group fixed bottom-6 right-6 z-40">
      <div className="absolute bottom-14 right-0 hidden w-[340px] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl group-hover:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          OPSCORE
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-950">
          Assistant Reminders
        </h2>

        <div className="mt-4 space-y-2">
          {normalizedReminders.length > 0 ? (
            normalizedReminders.map((item, index) => (
              <div
                key={`${item.status}-${index}`}
                className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${getReminderClass(
                  item.status,
                )}`}
              >
                {item.text}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold leading-5 text-slate-700">
              No active reminders right now.
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
        aria-label="OPSCORE Assistant"
      >
        <Bot size={20} />

        {hasAlert && (
          <>
            <span
              className={`absolute -right-1 -top-1 h-4 w-4 rounded-full ${dotClass}`}
            />
            <span
              className={`absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full ${dotClass} opacity-75`}
            />
          </>
        )}
      </button>
    </div>
  );
}

function getReminderClass(status: ReminderStatus) {
  if (status === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "info") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";

  return "border-slate-200 bg-slate-100 text-slate-700";
}


