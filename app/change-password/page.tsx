"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type SystemUser = {
  id: string;
  employee_id: string;
  username: string;
  password: string;
  is_active: boolean;
  must_change_password?: boolean | null;
};

export default function ChangePasswordPage() {
  const router = useRouter();

  /// STATES
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [systemUserId, setSystemUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  /// DATA
  const employeeIdKey = "opscore_current_employee_id";
  const systemUserIdKey = "opscore_current_system_user_id";
  const mustChangePasswordKey = "opscore_must_change_password";
  const employeeSessionKey = "opscore_current_employee";

  /// EFFECTS
  useEffect(() => {
    const savedEmployeeId = localStorage.getItem(employeeIdKey);
    const savedUserId = localStorage.getItem(systemUserIdKey);

    if (!savedEmployeeId || !savedUserId) {
      router.replace("/login");
      return;
    }

    setSystemUserId(savedUserId);
  }, [router]);

  /// FUNCTIONS
  const changePassword = async () => {
    if (!systemUserId) {
      setErrorMessage("User session not found. Please login again.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword === "Temp123!") {
      setErrorMessage("Please choose a password different from the temporary password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { data: userData, error: userError } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", systemUserId)
      .maybeSingle();

    const user = userData as SystemUser | null;

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("User session not found. Please login again.");
      return;
    }

    if (!user.is_active) {
      setSaving(false);
      setErrorMessage("This user account is inactive.");
      return;
    }

    if (String(user.password || "") !== currentPassword) {
      setSaving(false);
      setErrorMessage("Current password is incorrect.");
      return;
    }

    const { error } = await supabase
      .from("system_users")
      .update({
        password: newPassword,
        must_change_password: false,
      })
      .eq("id", systemUserId);

    if (error) {
      setSaving(false);
      setErrorMessage(error.message);
      return;
    }

    const savedEmployee = localStorage.getItem(employeeSessionKey);

    if (savedEmployee) {
      try {
        const parsed = JSON.parse(savedEmployee);
        localStorage.setItem(
          employeeSessionKey,
          JSON.stringify({
            ...parsed,
            must_change_password: false,
          })
        );
      } catch {
        // ignore local session update failure
      }
    }

    localStorage.setItem(mustChangePasswordKey, "false");
    window.dispatchEvent(new Event("storage"));
    setSaving(false);

    router.replace("/dashboard");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changePassword();
  };

  /// UI
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-300">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-400">
              OPSCORE Security
            </p>
            <h1 className="mt-1 text-3xl font-black">Change Password</h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-400">
          You are using a temporary password. Create your own password before continuing to OPSCORE.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showPasswords}
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showPasswords}
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPasswords}
          />

          <button
            type="button"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPasswords ? "Hide Passwords" : "Show Passwords"}
          </button>

          {errorMessage && (
            <div className="flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 focus-within:border-amber-400">
        <LockKeyhole size={18} className="text-slate-500" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}
