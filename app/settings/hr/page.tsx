import { supabase } from '@/lib/supabase';
"use client";


"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { createAuditLog } from "@/lib/audit";

type MasterKey = "departments" | "positions" | "employment_types";

type MasterConfig = {
  key: MasterKey;
  title: string;
  description: string;
  table: string;
  module: string;
  createAction: string;
  updateAction: string;
  deleteAction: string;
  placeholder: string;
};

export default function HRSettingsWorkbenchPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employmentStatuses, setEmploymentStatuses] = useState<any[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [inputs, setInputs] = useState<Record<string, string>>({
    departments: "",
    positions: "",
    employment_types: "",
  });

  const [editing, setEditing] = useState<{
    key: string;
    id: string;
    name: string;
  } | null>(null);

  const [statusForm, setStatusForm] = useState({
    id: "",
    name: "",
    count_in_workforce: true,
    allow_scheduling: true,
    show_in_reports: true,
  });

  const configs: MasterConfig[] = [
    {
      key: "departments",
      title: "Departments",
      description: "Department list used in Employee 201, workforce, and reports.",
      table: "departments",
      module: "Settings / Departments",
      createAction: "CREATE_DEPARTMENT",
      updateAction: "UPDATE_DEPARTMENT",
      deleteAction: "DELETE_DEPARTMENT",
      placeholder: "Department Name",
    },
    {
      key: "positions",
      title: "Positions",
      description: "Position list used in employee records and payroll references.",
      table: "positions",
      module: "Settings / Positions",
      createAction: "CREATE_POSITION",
      updateAction: "UPDATE_POSITION",
      deleteAction: "DELETE_POSITION",
      placeholder: "Position Name",
    },
    {
      key: "employment_types",
      title: "Employment Types",
      description: "Employment classifications used in Employee 201 records.",
      table: "employment_types",
      module: "Settings / Employment Types",
      createAction: "CREATE_EMPLOYMENT_TYPE",
      updateAction: "UPDATE_EMPLOYMENT_TYPE",
      deleteAction: "DELETE_EMPLOYMENT_TYPE",
      placeholder: "Employment Type Name",
    },
  ];

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const getRows = async (table: string) => {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log(`GET ${table.toUpperCase()} ERROR:`, error);
      return [];
    }

    return data || [];
  };

  const loadData = async () => {
    setLoading(true);

    const [
      departmentRows,
      positionRows,
      employmentTypeRows,
      employmentStatusRows,
      leaveSettingRows,
    ] = await Promise.all([
      getRows("departments"),
      getRows("positions"),
      getRows("employment_types"),
      getRows("employment_statuses"),
      supabase
        .from("leave_settings")
        .select("*")
        .order("id", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.log("GET LEAVE SETTINGS ERROR:", error);
            return [];
          }

          return data || [];
        }),
    ]);

    setDepartments(departmentRows);
    setPositions(positionRows);
    setEmploymentTypes(employmentTypeRows);
    setEmploymentStatuses(employmentStatusRows);
    setLeaveSettings(leaveSettingRows);

    setLoading(false);
  };

  const getDataByKey = (key: MasterKey) => {
    if (key === "departments") return departments;
    if (key === "positions") return positions;
    return employmentTypes;
  };

  const updateInput = (key: MasterKey, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const addMasterItem = async (config: MasterConfig) => {
    const cleanName = inputs[config.key].trim();
    if (!cleanName) return;

    const { data, error } = await supabase
      .from(config.table)
      .insert({ name: cleanName })
      .select()
      .single();

    if (error) {
      console.log(`ADD ${config.table} ERROR:`, error);
      alert("Failed to add record.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: config.module,
      action: config.createAction,
      description: `Created ${config.title}: ${cleanName}`,
      severity: "info",
      recordId: data.id,
      oldValue: null,
      newValue: data,
    });

    updateInput(config.key, "");
    loadData();
  };

  const startEdit = (config: MasterConfig, row: any) => {
    setEditing({
      key: config.key,
      id: row.id,
      name: row.name || "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const updateMasterItem = async (config: MasterConfig, row: any) => {
    if (!editing) return;

    const cleanName = editing.name.trim();
    if (!cleanName) return;

    const oldValue = { ...row };

    const { data, error } = await supabase
      .from(config.table)
      .update({ name: cleanName })
      .eq("id", row.id)
      .select()
      .single();

    if (error) {
      console.log(`UPDATE ${config.table} ERROR:`, error);
      alert("Failed to update record.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: config.module,
      action: config.updateAction,
      description: `Updated ${config.title} from "${oldValue.name}" to "${cleanName}"`,
      severity: "warning",
      recordId: row.id,
      oldValue,
      newValue: data,
    });

    cancelEdit();
    loadData();
  };

  const deleteMasterItem = async (config: MasterConfig, row: any) => {
    const confirmed = confirm(`Delete "${row.name}"?`);
    if (!confirmed) return;

    const oldValue = { ...row };

    const { error } = await supabase.from(config.table).delete().eq("id", row.id);

    if (error) {
      console.log(`DELETE ${config.table} ERROR:`, error);
      alert("Failed to delete record. It may already be used by employee records.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: config.module,
      action: config.deleteAction,
      description: `Deleted ${config.title}: ${row.name}`,
      severity: "critical",
      recordId: row.id,
      oldValue,
      newValue: null,
    });

    loadData();
  };

  const clearStatusForm = () => {
    setStatusForm({
      id: "",
      name: "",
      count_in_workforce: true,
      allow_scheduling: true,
      show_in_reports: true,
    });
  };

  const editEmploymentStatus = (status: any) => {
    setStatusForm({
      id: status.id,
      name: status.name || "",
      count_in_workforce: !!status.count_in_workforce,
      allow_scheduling: !!status.allow_scheduling,
      show_in_reports: !!status.show_in_reports,
    });
  };

  const saveEmploymentStatus = async () => {
    const cleanName = statusForm.name.trim();
    if (!cleanName) return;

    const payload = {
      name: cleanName,
      count_in_workforce: statusForm.count_in_workforce,
      allow_scheduling: statusForm.allow_scheduling,
      show_in_reports: statusForm.show_in_reports,
    };

    const oldValue = employmentStatuses.find((item) => item.id === statusForm.id);

    const query = statusForm.id
      ? supabase
          .from("employment_statuses")
          .update(payload)
          .eq("id", statusForm.id)
          .select()
          .single()
      : supabase
          .from("employment_statuses")
          .insert(payload)
          .select()
          .single();

    const { data, error } = await query;

    if (error) {
      console.log("SAVE EMPLOYMENT STATUS ERROR:", error);
      alert("Failed to save employment status.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Employment Statuses",
      action: statusForm.id
        ? "UPDATE_EMPLOYMENT_STATUS"
        : "CREATE_EMPLOYMENT_STATUS",
      description: statusForm.id
        ? `Updated employment status: ${cleanName}`
        : `Created employment status: ${cleanName}`,
      severity: statusForm.id ? "warning" : "info",
      recordId: data.id,
      oldValue: oldValue || null,
      newValue: data,
    });

    clearStatusForm();
    loadData();
  };

  const deleteEmploymentStatus = async (status: any) => {
    const confirmed = confirm(`Delete employment status "${status.name}"?`);
    if (!confirmed) return;

    const oldValue = { ...status };

    const { error } = await supabase
      .from("employment_statuses")
      .delete()
      .eq("id", status.id);

    if (error) {
      console.log("DELETE EMPLOYMENT STATUS ERROR:", error);
      alert("Failed to delete employment status.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Employment Statuses",
      action: "DELETE_EMPLOYMENT_STATUS",
      description: `Deleted employment status: ${status.name}`,
      severity: "critical",
      recordId: status.id,
      oldValue,
      newValue: null,
    });

    loadData();
  };

  const updateLeaveSetting = async (
    leave: any,
    field: "is_enabled" | "requires_credits",
    value: boolean
  ) => {
    const oldValue = { ...leave };

    const { data, error } = await supabase
      .from("leave_settings")
      .update({ [field]: value })
      .eq("id", leave.id)
      .select()
      .single();

    if (error) {
      console.log("UPDATE LEAVE SETTING ERROR:", error);
      alert("Failed to update leave setting.");
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Leave Settings",
      action: "UPDATE_LEAVE_SETTING",
      description: `Updated ${leave.leave_type} ${
        field === "is_enabled" ? "availability" : "credit deduction"
      } to ${value ? "enabled" : "disabled"}`,
      severity: "warning",
      recordId: String(leave.id),
      oldValue,
      newValue: data,
    });

    loadData();
  };

  const totals = useMemo(
    () => ({
      departments: departments.length,
      positions: positions.length,
      employmentTypes: employmentTypes.length,
      employmentStatuses: employmentStatuses.length,
      leaveTypes: leaveSettings.length,
      enabledLeaves: leaveSettings.filter((item) => item.is_enabled).length,
    }),
    [departments, positions, employmentTypes, employmentStatuses, leaveSettings]
  );

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageGuard moduleKey="departments_settings">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="HR SETTINGS / WORKBENCH" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    HR SETTINGS
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    HR Settings Workbench
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Maintain employee master data and leave configuration in one
                    consolidated OPSCORE settings page.
                  </p>
                </div>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Departments" value={totals.departments} />
              <KpiCard title="Positions" value={totals.positions} />
              <KpiCard title="Employment Rules" value={totals.employmentStatuses} />
              <KpiCard
                title="Enabled Leaves"
                value={`${totals.enabledLeaves}/${totals.leaveTypes}`}
              />
            </section>

            <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Consolidation Note
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Employee Master Data + Leave Controls
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-blue-700">
                This page replaces thin HR setup screens. Leave Credits should stay
                as a separate operational page because it manages employee balances
                and bulk credit updates.
              </p>
            </section>

            <SectionHeader
              title="Employee Master Data"
              description="Used by Employee 201, workforce, scheduling, payroll, leave, and reports."
            />

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              {configs.map((config) => (
                        <MasterDataPanel
            key={config.key}
            config={config}
            rows={getDataByKey(config.key)}
            inputValue={inputs[config.key]}
            onInputChange={(value: string) => updateInput(config.key, value)}
            onAdd={() => addMasterItem(config)}
            editing={editing}
            setEditing={setEditing}
            onStartEdit={(row: any) => startEdit(config, row)}
            onCancelEdit={cancelEdit}
            onUpdate={(row: any) => updateMasterItem(config, row)}
            onDelete={(row: any) => deleteMasterItem(config, row)}
            />
              ))}
            </section>

            <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Employment Rules
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Employment Statuses
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Controls whether a status counts in workforce, scheduling, and
                  reports.
                </p>
              </div>

              <div className="border-b border-slate-100 p-6">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto]">
                  <input
                    value={statusForm.name}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Status Name"
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <CheckControl
                    label="Workforce"
                    checked={statusForm.count_in_workforce}
                    onChange={(value) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        count_in_workforce: value,
                      }))
                    }
                  />

                  <CheckControl
                    label="Scheduling"
                    checked={statusForm.allow_scheduling}
                    onChange={(value) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        allow_scheduling: value,
                      }))
                    }
                  />

                  <CheckControl
                    label="Reports"
                    checked={statusForm.show_in_reports}
                    onChange={(value) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        show_in_reports: value,
                      }))
                    }
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={saveEmploymentStatus}
                      className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                    >
                      {statusForm.id ? "Update" : "Add"}
                    </button>

                    {statusForm.id && (
                      <button
                        onClick={clearStatusForm}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Status Name</th>
                      <th className="px-6 py-4 text-center">Workforce</th>
                      <th className="px-6 py-4 text-center">Scheduling</th>
                      <th className="px-6 py-4 text-center">Reports</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {employmentStatuses.map((status) => (
                      <tr
                        key={status.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-black text-slate-950">
                          {status.name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <BooleanBadge value={status.count_in_workforce} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <BooleanBadge value={status.allow_scheduling} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <BooleanBadge value={status.show_in_reports} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editEmploymentStatus(status)}
                              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteEmploymentStatus(status)}
                              className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {employmentStatuses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            No employment statuses found
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Add an employment status using the form above.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <SectionHeader
              title="Leave Configuration"
              description="Controls which leave types are available and whether they deduct credits."
            />

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Leave Policy Controls
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Leave Settings
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Enabled leaves appear in the request form. Deduct Credits
                  controls whether approval reduces employee leave balance.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Leave Type</th>
                      <th className="px-6 py-4">Enabled</th>
                      <th className="px-6 py-4">Deduct Credits</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {leaveSettings.map((leave) => (
                      <tr
                        key={leave.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-black text-slate-950">
                          {leave.leave_type}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              updateLeaveSetting(
                                leave,
                                "is_enabled",
                                !leave.is_enabled
                              )
                            }
                            className={
                              leave.is_enabled
                                ? "h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 active:scale-[0.98]"
                                : "h-10 rounded-xl border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-[0.98]"
                            }
                          >
                            {leave.is_enabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              updateLeaveSetting(
                                leave,
                                "requires_credits",
                                !leave.requires_credits
                              )
                            }
                            className={
                              leave.requires_credits
                                ? "h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 active:scale-[0.98]"
                                : "h-10 rounded-xl border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-[0.98]"
                            }
                          >
                            {leave.requires_credits ? "Deduct" : "No Deduction"}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {leaveSettings.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            No leave settings found
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Seed leave settings before configuring leave policies.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function KpiCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Settings Group
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MasterDataPanel({
  config,
  rows,
  inputValue,
  onInputChange,
  onAdd,
  editing,
  setEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: any) {
  const isEditingThisPanel = editing?.key === config.key;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Master Data
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          {config.title}
        </h3>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
          {config.description}
        </p>
      </div>

      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={config.placeholder}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />

          <button
            onClick={onAdd}
            className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[520px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {rows.map((row: any) => (
              <tr
                key={row.id}
                className="transition-all duration-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  {isEditingThisPanel && editing?.id === row.id ? (
                    <input
                      value={editing.name}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          name: event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  ) : (
                    <span className="font-black text-slate-950">{row.name}</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {isEditingThisPanel && editing?.id === row.id ? (
                      <>
                        <button
                          onClick={() => onUpdate(row)}
                          className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onStartEdit(row)}
                          className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(row)}
                          className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-950">
                    No records found
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Add a record using the form above.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CheckControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      Yes
    </span>
  ) : (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      No
    </span>
  );
}





