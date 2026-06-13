"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type SystemUser = {
  id: string;
  auth_user_id: string | null;
  employee_id: string | null;
  username: string;
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
  const [authEmail, setAuthEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  /// DATA
  const systemUserIdKey = "opscore_current_system_user_id";
  const mustChangePasswordKey = "opscore_must_change_password";
  const employeeSessionKey = "opscore_current_employee";
  const currentUserKey = "opscore_current_user";

  /// EFFECTS
  useEffect(() => {
    const loadSession = async () => {
      const savedSystemUserId = localStorage.getItem(systemUserIdKey);

      if (!savedSystemUserId) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setSystemUserId(savedSystemUserId);
      setAuthEmail(data.user.email || "");
      setChecking(false);
    };

    loadSession();
  }, [router]);

  /// FUNCTIONS
  const changePassword = async () => {
    if (!systemUserId || !authEmail) {
      setErrorMessage("User session not found. Please login again.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage(
        "New password must be different from your current password."
      );
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
      .select(
        "id, auth_user_id, employee_id, username, is_active, must_change_password"
      )
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

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: currentPassword,
    });

    if (verifyError) {
      setSaving(false);
      setErrorMessage("Current password is incorrect.");
      return;
    }

    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateAuthError) {
      setSaving(false);
      setErrorMessage(updateAuthError.message);
      return;
    }

    const { error: updateUserError } = await supabase
      .from("system_users")
      .update({
        must_change_password: false,
      })
      .eq("id", systemUserId);

    if (updateUserError) {
      setSaving(false);
      setErrorMessage(updateUserError.message);
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

    const savedCurrentUser = localStorage.getItem(currentUserKey);

    if (savedCurrentUser) {
      try {
        const parsed = JSON.parse(savedCurrentUser);

        localStorage.setItem(
          currentUserKey,
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
  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 px-5 text-slate-900">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-sm font-bold text-slate-500 shadow-sm backdrop-blur">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 px-5 py-10 text-slate-900">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white/85 shadow-2xl shadow-slate-950/10 backdrop-blur">
        <div className="border-b border-slate-100 bg-slate-50/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
              <ShieldCheck size={23} />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                OPSCORE V3 Security
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Change Password
              </h1>
            </div>
          </div>

          <p className="mt-5 text-sm font-medium leading-6 text-slate-500">
            You are using a temporary password. Create your own secure password
            before continuing to OPSCORE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPasswords ? "Hide Passwords" : "Show Passwords"}
          </button>

          {errorMessage && (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-5 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save New Password"}
            </button>
          </div>
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
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>

      <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-300 bg-white/80 px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
        <LockKeyhole size={17} className="text-slate-400" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}