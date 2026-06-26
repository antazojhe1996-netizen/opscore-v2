# OPSCORE Database Book

Total Tables: 118
Total Columns: 1000
Total Primary Keys: 110

---

## Tables

- `public.activity_logs`
- `public.announcements`
- `public.apartment_bills`
- `public.apartment_payments`
- `public.apartment_units`
- `public.approval_assignments`
- `public.approval_requests`
- `public.approval_workflows`
- `public.archive_cash_advance_requests_20260617`
- `public.archive_employee_balances_20260617`
- `public.archive_finance_cash_drawers_20260617`
- `public.attendance_entries`
- `public.attendance_geofence_settings`
- `public.audit_logs`
- `public.biometric_mappings`
- `public.cash_advance_requests`
- `public.cash_drawers`
- `public.cash_execution_locks`
- `public.cash_movements`
- `public.companies`
- `public.company_users`
- `public.departments`
- `public.direct_sales_import_lines`
- `public.document_sequences`
- `public.employee_balances`
- `public.employee_coaching_logs`
- `public.employee_leave_credits`
- `public.employee_registration_requests`
- `public.employees`
- `public.employees_backup_before_vrh_renumber`
- `public.employment_statuses`
- `public.employment_types`
- `public.event_addons`
- `public.expense_allocation_rules`
- `public.expense_categories`
- `public.expense_requests`
- `public.expense_subcategories`
- `public.expenses`
- `public.finance_bills`
- `public.finance_cash_counts`
- `public.finance_cash_drawer_state`
- `public.finance_cash_drawers`
- `public.finance_cash_management`
- `public.finance_cash_movements`
- `public.finance_cash_release_types`
- `public.finance_cash_settings`
- `public.finance_cash_sources`
- `public.finance_departments`
- `public.finance_expense_areas`
- `public.finance_expense_categories`
- `public.finance_expense_sources`
- `public.finance_hotel_reservations`
- `public.finance_hotel_revenue`
- `public.finance_payment_methods`
- `public.finance_payment_sources`
- `public.finance_revenue_sources`
- `public.finance_settings`
- `public.finance_workflow_settings`
- `public.forecasting_settings`
- `public.hc_rule_settings`
- `public.hc_rules`
- `public.leave_requests`
- `public.leave_settings`
- `public.occupancy_data`
- `public.onboarding_settings`
- `public.ota_statement_lines`
- `public.payment_sources`
- `public.payroll_adjustments`
- `public.payroll_deduction_types`
- `public.payroll_holidays`
- `public.payroll_periods`
- `public.payroll_records`
- `public.payroll_release_history`
- `public.payroll_release_transactions`
- `public.payroll_settings`
- `public.payroll_snapshot_items`
- `public.payroll_snapshots`
- `public.payroll_snapshots_old_wrong`
- `public.peak_day_rules`
- `public.performance_history`
- `public.performance_kpi_settings`
- `public.pos_categories`
- `public.pos_categories_backup_20260620`
- `public.pos_menu_groups`
- `public.pos_menu_items`
- `public.pos_menu_items_backup_20260620`
- `public.pos_modifier_groups`
- `public.pos_modifier_options`
- `public.pos_modifier_templates`
- `public.pos_order_item_modifiers`
- `public.pos_order_items`
- `public.pos_order_types`
- `public.pos_orders`
- `public.pos_payment_methods`
- `public.pos_payments`
- `public.pos_product_modifier_templates`
- `public.pos_production_stations`
- `public.pos_production_stations_backup_20260620`
- `public.pos_sessions`
- `public.pos_settings`
- `public.pos_setup_pack_groups`
- `public.pos_setup_packs`
- `public.pos_tables`
- `public.pos_template_modifier_groups`
- `public.pos_voids`
- `public.positions`
- `public.released_payroll_items`
- `public.released_payrolls`
- `public.restaurant_sales`
- `public.role_permissions`
- `public.schedule_overrides`
- `public.schedule_publications`
- `public.schedules`
- `public.shift_templates`
- `public.system_roles`
- `public.system_users`
- `public.watcher_findings`
- `public.watcher_request_type_mapping`

---

# activity_logs

Schema: `public`

## Primary Key

- `id` (activity_logs_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| module | text | NO |  |  |
| action | text | NO |  |  |
| user_name | text | YES |  |  |
| details | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# announcements

Schema: `public`

## Primary Key

- `id` (announcements_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| title | text | YES |  |  |
| message | text | YES |  |  |
| body | text | YES |  |  |
| priority | text | YES | 'Normal'::text |  |
| audience | text | YES | 'All Employees'::text |  |
| posted_by | text | YES |  |  |
| created_by | text | YES |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# apartment_bills

Schema: `public`

## Primary Key

- `id` (apartment_bills_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| unit_id | uuid | YES |  |  |
| bill_month | text | NO |  |  |
| due_date | date | NO |  |  |
| rent_amount | numeric | YES | 0 |  |
| electric_amount | numeric | YES | 0 |  |
| water_amount | numeric | YES | 0 |  |
| internet_amount | numeric | YES | 0 |  |
| other_amount | numeric | YES | 0 |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# apartment_payments

Schema: `public`

## Primary Key

- `id` (apartment_payments_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| bill_id | uuid | YES |  |  |
| payment_date | date | NO |  |  |
| amount | numeric | YES | 0 |  |
| payment_method | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| status | text | YES | 'ACTIVE'::text |  |
| void_reason | text | YES |  |  |
| voided_by | text | YES |  |  |
| voided_at | timestamp with time zone | YES |  |  |

---

# apartment_units

Schema: `public`

## Primary Key

- `id` (apartment_units_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| unit_name | text | NO |  |  |
| tenant_name | text | YES |  |  |
| monthly_rent | numeric | YES | 0 |  |
| internet_fee | numeric | YES | 0 |  |
| status | text | YES | 'Occupied'::text |  |
| created_at | timestamp with time zone | YES | now() |  |
| due_day | numeric | YES | 5 |  |
| notes | text | YES |  |  |

---

# approval_assignments

Schema: `public`

## Primary Key

- `id` (approval_assignments_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| approval_role | text | NO |  |  |
| employee_id | uuid | YES |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| assignment_type | text | YES | 'PRIMARY'::text |  |
| department_scope | text | YES |  |  |
| is_default | boolean | YES | false |  |
| department_scopes | jsonb | YES | '[]'::jsonb |  |
| workflow_keys | ARRAY | YES |  |  |

---

# approval_requests

Schema: `public`

## Primary Key

- `id` (approval_requests_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| request_type | text | NO |  |  |
| module | text | NO |  |  |
| reference_id | text | YES |  |  |
| title | text | NO |  |  |
| description | text | YES |  |  |
| requested_by | text | YES |  |  |
| requested_at | timestamp with time zone | YES | now() |  |
| status | text | YES | 'PENDING'::text |  |
| approved_by | text | YES |  |  |
| approved_at | timestamp with time zone | YES |  |  |
| rejected_by | text | YES |  |  |
| rejected_at | timestamp with time zone | YES |  |  |
| rejection_reason | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| request_payload | jsonb | YES |  |  |
| company_id | uuid | NO |  |  |
| reference_no | text | YES |  |  |
| source_document_type | text | YES |  |  |
| source_document_id | uuid | YES |  |  |
| type | text | YES |  |  |
| category | text | YES |  |  |
| amount | numeric | YES |  |  |
| payment_method | text | YES |  |  |

---

# approval_workflows

Schema: `public`

## Primary Key

- `id` (approval_workflows_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| workflow_key | text | YES |  |  |
| workflow_name | text | YES |  |  |
| module | text | YES |  |  |
| approval_required | boolean | YES | true |  |
| approver_role | text | YES | 'MANAGER'::text |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| company_id | uuid | NO |  |  |

---

# archive_cash_advance_requests_20260617

Schema: `public`

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| amount | numeric | YES |  |  |
| purpose | text | YES |  |  |
| status | text | YES |  |  |
| approved_at | timestamp with time zone | YES |  |  |
| approved_by | text | YES |  |  |
| released_at | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| payroll_period_id | uuid | YES |  |  |
| created_at | timestamp with time zone | YES |  |  |
| company_id | uuid | YES |  |  |
| reference_no | text | YES |  |  |

---

# archive_employee_balances_20260617

Schema: `public`

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| balance_type | text | YES |  |  |
| original_amount | numeric | YES |  |  |
| remaining_balance | numeric | YES |  |  |
| status | text | YES |  |  |
| source_module | text | YES |  |  |
| source_id | uuid | YES |  |  |
| period_id | uuid | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES |  |  |
| updated_at | timestamp with time zone | YES |  |  |
| cancel_reason | text | YES |  |  |
| cancelled_at | timestamp with time zone | YES |  |  |
| payment_method | text | YES |  |  |
| company_id | uuid | YES |  |  |
| void_reason | text | YES |  |  |
| voided_by | text | YES |  |  |
| voided_at | timestamp with time zone | YES |  |  |

---

# archive_finance_cash_drawers_20260617

Schema: `public`

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | YES |  |  |
| holder_name | text | YES |  |  |
| opening_float | numeric | YES |  |  |
| opened_at | timestamp with time zone | YES |  |  |
| closed_at | timestamp with time zone | YES |  |  |
| expected_cash | numeric | YES |  |  |
| actual_cash | numeric | YES |  |  |
| variance | numeric | YES |  |  |
| status | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES |  |  |

---

# attendance_entries

Schema: `public`

## Primary Key

- `id` (attendance_entries_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| employee_id | uuid | YES |  |  |
| attendance_date | date | NO |  |  |
| scheduled_shift | text | YES |  |  |
| scheduled_in | time without time zone | YES |  |  |
| scheduled_out | time without time zone | YES |  |  |
| time_in | time without time zone | YES |  |  |
| time_out | time without time zone | YES |  |  |
| late_minutes | numeric | YES | 0 |  |
| undertime_minutes | numeric | YES | 0 |  |
| ot_minutes | numeric | YES | 0 |  |
| status | text | YES | 'Present'::text |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| worked_minutes | numeric | YES | 0 |  |
| attendance_source | text | YES | 'Manual'::text |  |
| time_in_latitude | numeric | YES |  |  |
| time_in_longitude | numeric | YES |  |  |
| time_out_latitude | numeric | YES |  |  |
| time_out_longitude | numeric | YES |  |  |
| time_in_accuracy | numeric | YES |  |  |
| time_out_accuracy | numeric | YES |  |  |
| time_in_location_status | text | YES |  |  |
| time_out_location_status | text | YES |  |  |
| geofence_status | text | YES |  |  |
| geofence_distance_meters | numeric | YES |  |  |
| geofence_property_name | text | YES |  |  |
| approved_ot_minutes | numeric | YES | 0 |  |
| ot_approval_status | text | YES | 'NOT_REQUIRED'::text |  |
| ot_approval_request_id | uuid | YES |  |  |
| ot_approved_by | text | YES |  |  |
| ot_approved_at | timestamp with time zone | YES |  |  |
| ot_rejected_by | text | YES |  |  |
| ot_rejected_at | timestamp with time zone | YES |  |  |
| ot_rejection_reason | text | YES |  |  |

---

# attendance_geofence_settings

Schema: `public`

## Primary Key

- `id` (attendance_geofence_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| property_name | text | NO |  |  |
| latitude | numeric | NO |  |  |
| longitude | numeric | NO |  |  |
| allowed_radius_meters | integer | NO | 100 |  |
| gps_required | boolean | NO | false |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

---

# audit_logs

Schema: `public`

## Primary Key

- `id` (audit_logs_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| created_at | timestamp with time zone | YES | now() |  |
| user_id | uuid | YES |  |  |
| user_name | text | YES |  |  |
| module | text | NO |  |  |
| action | text | NO |  |  |
| description | text | YES |  |  |
| severity | text | YES | 'info'::text |  |
| record_id | text | YES |  |  |
| old_value | jsonb | YES |  |  |
| new_value | jsonb | YES |  |  |
| ip_address | text | YES |  |  |
| user_agent | text | YES |  |  |

---

# biometric_mappings

Schema: `public`

## Primary Key

- `id` (biometric_mappings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| employee_id | uuid | NO |  |  |
| biometric_employee_no | text | YES |  |  |
| biometric_name | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# cash_advance_requests

Schema: `public`

## Primary Key

- `id` (cash_advance_requests_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| amount | numeric | YES | 0 |  |
| purpose | text | YES |  |  |
| status | text | YES | 'PENDING'::text |  |
| approved_at | timestamp with time zone | YES |  |  |
| approved_by | text | YES |  |  |
| released_at | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| payroll_period_id | uuid | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| company_id | uuid | NO |  |  |
| reference_no | text | YES |  |  |

---

# cash_drawers

Schema: `public`

## Primary Key

- `id` (cash_drawers_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | uuid_generate_v4() | YES |
| company_id | uuid | NO |  |  |
| holder_name | text | NO |  |  |
| opening_float | numeric | YES | 0 |  |
| actual_cash | numeric | YES | 0 |  |
| status | text | YES | 'OPEN'::text |  |
| opened_at | timestamp without time zone | YES | now() |  |
| closed_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# cash_execution_locks

Schema: `public`

## Primary Key

- `id` (cash_execution_locks_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| source_document_id | text | YES |  |  |
| type | text | YES |  |  |
| company_id | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# cash_movements

Schema: `public`

## Primary Key

- `id` (cash_movements_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | uuid_generate_v4() | YES |
| type | text | YES |  |  |
| category | text | YES |  |  |
| amount | numeric | YES |  |  |
| payment_method | text | YES |  |  |
| reference_no | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| drawer_id | uuid | YES |  |  |
| holder_name | text | YES |  |  |

---

# companies

Schema: `public`

## Primary Key

- `id` (companies_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| slug | text | NO |  |  |
| company_code | text | YES |  |  |
| industry_type | text | YES | 'hotel'::text |  |
| status | text | YES | 'active'::text |  |
| contact_person | text | YES |  |  |
| contact_email | text | YES |  |  |
| contact_number | text | YES |  |  |
| address | text | YES |  |  |
| subscription_plan | text | YES | 'starter'::text |  |
| subscription_status | text | YES | 'active'::text |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# company_users

Schema: `public`

## Primary Key

- `id` (company_users_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| user_id | uuid | NO |  |  |
| role_id | uuid | YES |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# departments

Schema: `public`

## Primary Key

- `id` (departments_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# direct_sales_import_lines

Schema: `public`

## Primary Key

- `id` (direct_sales_import_lines_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| sales_date | date | YES |  |  |
| reference_no | text | YES |  |  |
| guest_name | text | YES |  |  |
| room | text | YES |  |  |
| room_type | text | YES |  |  |
| payment_method | text | YES | 'Cash'::text |  |
| source | text | YES | 'Walk-in / Direct'::text |  |
| gross_amount | numeric | YES | 0 |  |
| collected_amount | numeric | YES | 0 |  |
| remarks | text | YES |  |  |
| import_key | text | NO |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# document_sequences

Schema: `public`

## Primary Key

- `id` (document_sequences_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| document_type | text | NO |  |  |
| current_number | integer | NO | 0 |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# employee_balances

Schema: `public`

## Primary Key

- `id` (employee_balances_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| balance_type | text | YES |  |  |
| original_amount | numeric | YES | 0 |  |
| remaining_balance | numeric | YES | 0 |  |
| status | text | YES | 'Active'::text |  |
| source_module | text | YES |  |  |
| source_id | uuid | YES |  |  |
| period_id | uuid | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| cancel_reason | text | YES |  |  |
| cancelled_at | timestamp with time zone | YES |  |  |
| payment_method | text | YES |  |  |
| company_id | uuid | NO |  |  |
| void_reason | text | YES |  |  |
| voided_by | text | YES |  |  |
| voided_at | timestamp with time zone | YES |  |  |

---

# employee_coaching_logs

Schema: `public`

## Primary Key

- `id` (employee_coaching_logs_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| employee_id | uuid | NO |  |  |
| coach_name | text | YES |  |  |
| reason | text | YES |  |  |
| action_plan | text | YES |  |  |
| followup_date | date | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# employee_leave_credits

Schema: `public`

## Primary Key

- `id` (employee_leave_credits_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| employee_no | text | NO |  |  |
| leave_type | text | NO |  |  |
| credits | integer | YES | 0 |  |
| used_credits | integer | YES | 0 |  |
| remaining_credits | integer | YES | 0 |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# employee_registration_requests

Schema: `public`

## Primary Key

- `id` (employee_registration_requests_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| first_name | text | NO |  |  |
| middle_name | text | YES |  |  |
| last_name | text | NO |  |  |
| suffix | text | YES |  |  |
| birth_date | date | YES |  |  |
| gender | text | YES |  |  |
| civil_status | text | YES |  |  |
| nationality | text | YES |  |  |
| mobile_number | text | YES |  |  |
| email | text | YES |  |  |
| address | text | YES |  |  |
| sss_no | text | YES |  |  |
| philhealth_no | text | YES |  |  |
| pagibig_no | text | YES |  |  |
| tin_no | text | YES |  |  |
| emergency_contact_name | text | YES |  |  |
| emergency_contact_relationship | text | YES |  |  |
| emergency_contact_number | text | YES |  |  |
| emergency_contact_address | text | YES |  |  |
| status | text | NO | 'PENDING'::text |  |
| reviewed_by | uuid | YES |  |  |
| reviewed_at | timestamp with time zone | YES |  |  |
| rejection_reason | text | YES |  |  |
| submitted_at | timestamp with time zone | NO | now() |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

---

# employees

Schema: `public`

## Primary Key

- `id` (employees_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| employee_no | text | NO |  |  |
| first_name | text | NO |  |  |
| last_name | text | NO |  |  |
| department | text | NO |  |  |
| position | text | NO |  |  |
| employment_status | text | NO |  |  |
| daily_rate | numeric | NO |  |  |
| hire_date | text | YES |  |  |
| contact_number | text | NO |  |  |
| created_at | timestamp with time zone | NO |  |  |
| employment_type | text | YES |  |  |
| id | uuid | NO | gen_random_uuid() | YES |
| rate_type | text | YES | 'Daily'::text |  |
| basic_rate | numeric | YES | 0 |  |
| payroll_active | boolean | YES | true |  |
| payroll_notes | text | YES |  |  |
| biometric_name | text | YES |  |  |
| email | text | YES |  |  |
| sss_no | text | YES |  |  |
| philhealth_no | text | YES |  |  |
| pagibig_no | text | YES |  |  |
| tin_no | text | YES |  |  |
| birth_date | date | YES |  |  |
| gender | text | YES |  |  |
| civil_status | text | YES |  |  |
| address | text | YES |  |  |
| emergency_contact_name | text | YES |  |  |
| emergency_contact_number | text | YES |  |  |
| emergency_contact_relationship | text | YES |  |  |
| has_resume | boolean | YES | false |  |
| has_valid_id | boolean | YES | false |  |
| has_contract | boolean | YES | false |  |
| has_nbi_clearance | boolean | YES | false |  |
| has_medical | boolean | YES | false |  |
| has_training_records | boolean | YES | false |  |
| system_role_id | uuid | YES |  |  |
| portal_enabled | boolean | YES | false |  |
| attendance_source_preference | text | YES | 'Biometrics'::text |  |
| company_id | uuid | YES |  |  |
| pos_pin | text | YES |  |  |
| can_access_pos | boolean | YES | false |  |
| admin_access_enabled | boolean | YES | false |  |

---

# employees_backup_before_vrh_renumber

Schema: `public`

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| employee_no | text | YES |  |  |
| first_name | text | YES |  |  |
| last_name | text | YES |  |  |
| department | text | YES |  |  |
| position | text | YES |  |  |
| employment_status | text | YES |  |  |
| daily_rate | numeric | YES |  |  |
| hire_date | text | YES |  |  |
| contact_number | text | YES |  |  |
| created_at | timestamp with time zone | YES |  |  |
| employment_type | text | YES |  |  |
| id | uuid | YES |  |  |
| rate_type | text | YES |  |  |
| basic_rate | numeric | YES |  |  |
| payroll_active | boolean | YES |  |  |
| payroll_notes | text | YES |  |  |
| biometric_name | text | YES |  |  |
| email | text | YES |  |  |
| sss_no | text | YES |  |  |
| philhealth_no | text | YES |  |  |
| pagibig_no | text | YES |  |  |
| tin_no | text | YES |  |  |
| birth_date | date | YES |  |  |
| gender | text | YES |  |  |
| civil_status | text | YES |  |  |
| address | text | YES |  |  |
| emergency_contact_name | text | YES |  |  |
| emergency_contact_number | text | YES |  |  |
| emergency_contact_relationship | text | YES |  |  |
| has_resume | boolean | YES |  |  |
| has_valid_id | boolean | YES |  |  |
| has_contract | boolean | YES |  |  |
| has_nbi_clearance | boolean | YES |  |  |
| has_medical | boolean | YES |  |  |
| has_training_records | boolean | YES |  |  |
| system_role_id | uuid | YES |  |  |
| portal_enabled | boolean | YES |  |  |
| attendance_source_preference | text | YES |  |  |
| company_id | uuid | YES |  |  |
| pos_pin | text | YES |  |  |
| can_access_pos | boolean | YES |  |  |
| admin_access_enabled | boolean | YES |  |  |

---

# employment_statuses

Schema: `public`

## Primary Key

- `id` (employment_statuses_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| count_in_workforce | boolean | YES | true |  |
| allow_scheduling | boolean | YES | true |  |
| show_in_reports | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# employment_types

Schema: `public`

## Primary Key

- `id` (employment_types_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# event_addons

Schema: `public`

## Primary Key

- `id` (event_addons_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| event_name | text | NO |  |  |
| event_date | date | NO |  |  |
| department | text | YES |  |  |
| additional_hc | integer | NO | 0 |  |
| created_at | timestamp with time zone | YES | now() |  |
| expected_pax | integer | YES | 0 |  |
| remarks | text | YES |  |  |

---

# expense_allocation_rules

Schema: `public`

## Primary Key

- `id` (expense_allocation_rules_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| expense_type | text | NO |  |  |
| rooms_percent | numeric | YES | 0 |  |
| restaurant_percent | numeric | YES | 0 |  |
| sports_bar_percent | numeric | YES | 0 |  |
| apartment_percent | numeric | YES | 0 |  |
| shared_percent | numeric | YES | 0 |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# expense_categories

Schema: `public`

## Primary Key

- `id` (expense_categories_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| category_name | text | YES |  |  |
| group_name | text | YES | 'Operating Expenses'::text |  |
| default_business_unit | text | YES | 'Shared'::text |  |
| description | text | YES |  |  |
| is_employee_related | boolean | YES | false |  |
| is_payroll_deductible | boolean | YES | false |  |

---

# expense_requests

Schema: `public`

## Primary Key

- `id` (expense_requests_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| request_date | date | YES | CURRENT_DATE |  |
| department | text | YES |  |  |
| requested_by | text | YES |  |  |
| category | text | YES |  |  |
| expense_area | text | YES |  |  |
| expense_source | text | YES |  |  |
| payment_method | text | YES |  |  |
| amount | numeric | YES | 0 |  |
| reason | text | YES |  |  |
| urgency | text | YES |  |  |
| status | text | YES | 'PENDING'::text |  |
| approved_by | text | YES |  |  |
| approved_date | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| released_date | timestamp with time zone | YES |  |  |
| liquidated_by | text | YES |  |  |
| liquidated_date | timestamp with time zone | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| approval_role | text | YES |  |  |
| posted_to_expenses | boolean | YES | false |  |
| posted_expense_id | uuid | YES |  |  |
| posted_date | timestamp with time zone | YES |  |  |
| requestor_type | text | YES | 'Employee'::text |  |
| company_id | uuid | NO |  |  |

---

# expense_subcategories

Schema: `public`

## Primary Key

- `id` (expense_subcategories_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| category_id | uuid | YES |  |  |
| category | text | YES |  |  |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# expenses

Schema: `public`

## Primary Key

- `id` (expenses_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| expense_date | date | NO |  |  |
| category | text | NO |  |  |
| department | text | YES |  |  |
| description | text | YES |  |  |
| amount | numeric | YES | 0 |  |
| payment_method | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| source | text | YES |  |  |
| posted_to_cash_movements | boolean | YES | false |  |
| cash_movement_id | uuid | YES |  |  |
| cash_posted_date | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| encoded_by | text | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| deduct_to_payroll | boolean | YES | false |  |
| payroll_adjustment_id | uuid | YES |  |  |
| source_type | text | YES | 'Manual'::text |  |
| source_bill_id | uuid | YES |  |  |
| payroll_period_id | uuid | YES |  |  |
| subcategory | text | YES |  |  |
| employee_balance_id | uuid | YES |  |  |
| company_id | uuid | NO |  |  |
| reference_no | text | YES |  |  |
| void_reason | text | YES |  |  |
| voided_by | text | YES |  |  |
| voided_at | timestamp with time zone | YES |  |  |
| status | text | YES | 'ACTIVE'::text |  |
| released_amount | numeric | YES | 0 |  |
| actual_spent_amount | numeric | YES | 0 |  |
| returned_cash_amount | numeric | YES | 0 |  |
| net_expense_amount | numeric | YES | 0 |  |
| liquidation_status | text | YES | 'FOR_LIQUIDATION'::text |  |
| liquidated_at | timestamp with time zone | YES |  |  |
| liquidation_remarks | text | YES |  |  |
| receipt_count | integer | YES |  |  |
| return_cash_movement_id | uuid | YES |  |  |
| liquidation_category | text | YES |  |  |
| liquidated_by | text | YES |  |  |
| approval_request_id | uuid | YES |  |  |
| return_destination | text | YES | 'CASH_DRAWER'::text |  |

---

# finance_bills

Schema: `public`

## Primary Key

- `id` (finance_bills_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| bill_year | integer | NO |  |  |
| bill_month | integer | NO |  |  |
| category | text | NO |  |  |
| amount | numeric | NO | 0 |  |
| status | text | NO | 'Pending'::text |  |
| due_date | date | YES |  |  |
| paid_date | date | YES |  |  |
| payment_method | text | YES |  |  |
| remarks | text | YES |  |  |
| expense_id | uuid | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| company_id | uuid | NO |  |  |

---

# finance_cash_counts

Schema: `public`

## Primary Key

- `id` (finance_cash_counts_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| report_date | date | NO |  |  |
| opening_float | numeric | YES | 0 |  |
| actual_cash | numeric | YES | 0 |  |
| prepared_by | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_cash_drawer_state

Schema: `public`

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | YES | gen_random_uuid() |  |
| company_id | text | YES |  |  |
| cash_drawer_id | text | YES |  |  |
| expected_cash | numeric | YES | 0 |  |
| actual_cash | numeric | YES | 0 |  |
| status | text | YES |  |  |
| updated_at | timestamp without time zone | YES | now() |  |

---

# finance_cash_drawers

Schema: `public`

## Primary Key

- `id` (finance_cash_drawers_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| holder_name | text | NO |  |  |
| opening_float | numeric | YES | 0 |  |
| opened_at | timestamp with time zone | YES | now() |  |
| closed_at | timestamp with time zone | YES |  |  |
| expected_cash | numeric | YES | 0 |  |
| actual_cash | numeric | YES | 0 |  |
| variance | numeric | YES | 0 |  |
| status | text | YES | 'OPEN'::text |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| closing_remittance_amount | numeric | YES | 0 |  |
| closing_gcash_remittance_amount | numeric | YES | 0 |  |
| closing_remittance_received_by | text | YES |  |  |
| closing_remittance_remarks | text | YES |  |  |
| company_id | uuid | YES |  |  |

---

# finance_cash_management

Schema: `public`

## Primary Key

- `id` (finance_cash_management_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| business_date | date | NO |  |  |
| opening_float | numeric | YES | 0 |  |
| actual_cash | numeric | YES | 0 |  |
| expected_cash | numeric | YES | 0 |  |
| variance | numeric | YES | 0 |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| room_sales_cash | numeric | YES | 0 |  |
| restaurant_cash | numeric | YES | 0 |  |
| apartment_cash | numeric | YES | 0 |  |
| other_cash | numeric | YES | 0 |  |
| company_id | uuid | YES |  |  |
| holder_id | uuid | YES |  |  |
| status | text | YES | 'OPEN'::text |  |

---

# finance_cash_movements

Schema: `public`

## Primary Key

- `id` (finance_cash_movements_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| business_date | date | NO | CURRENT_DATE |  |
| movement_time | timestamp with time zone | YES | now() |  |
| movement_type | text | NO |  |  |
| source | text | NO |  |  |
| amount | numeric | YES | 0 |  |
| from_person | text | YES |  |  |
| to_person | text | YES |  |  |
| encoded_by | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| payment_type | text | YES | 'Cash'::text |  |
| reference_type | text | YES |  |  |
| cash_drawer_id | uuid | YES |  |  |
| company_id | uuid | NO |  |  |
| status | text | YES | 'ACTIVE'::text |  |
| void_reason | text | YES |  |  |
| voided_by | text | YES |  |  |
| voided_at | timestamp with time zone | YES |  |  |
| liquidation_status | text | YES | 'NOT_REQUIRED'::text |  |
| actual_spent_amount | numeric | YES | 0 |  |
| returned_cash_amount | numeric | YES | 0 |  |
| net_expense_amount | numeric | YES | 0 |  |
| liquidation_category | text | YES |  |  |
| liquidated_at | timestamp with time zone | YES |  |  |
| liquidated_by | text | YES |  |  |
| receipt_count | integer | YES | 0 |  |
| liquidation_return_movement_id | uuid | YES |  |  |
| liquidation_remarks | text | YES |  |  |
| origin_type | text | YES |  |  |
| origin_id | uuid | YES |  |  |
| created_by_module | text | YES |  |  |
| source_action | text | YES |  |  |
| created_by_user_id | uuid | YES |  |  |
| created_by_user_name | text | YES |  |  |
| return_destination | text | YES | 'CASH_DRAWER'::text |  |
| source_document_id | uuid | YES |  |  |
| idempotency_key | text | YES |  |  |

---

# finance_cash_release_types

Schema: `public`

## Primary Key

- `id` (finance_cash_release_types_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| description | text | YES |  |  |
| is_active | boolean | YES | true |  |
| is_employee_related | boolean | YES | false |  |
| is_payroll_deductible | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_cash_settings

Schema: `public`

## Primary Key

- `id` (finance_cash_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| track_cash_on_hand | boolean | YES | true |  |
| require_daily_cash_count | boolean | YES | true |  |
| include_room_sales | boolean | YES | true |  |
| include_restaurant_sales | boolean | YES | true |  |
| include_apartment_sales | boolean | YES | true |  |
| include_expenses | boolean | YES | true |  |
| require_expense_approval | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_cash_sources

Schema: `public`

## Primary Key

- `id` (finance_cash_sources_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | YES |  |  |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp without time zone | YES | now() |  |
| movement_type | text | NO | 'Cash In'::text |  |
| category | text | NO | 'Revenue'::text |  |
| updated_at | timestamp with time zone | NO | now() |  |

---

# finance_departments

Schema: `public`

## Primary Key

- `id` (finance_departments_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_expense_areas

Schema: `public`

## Primary Key

- `id` (finance_expense_areas_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_expense_categories

Schema: `public`

## Primary Key

- `id` (finance_expense_categories_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# finance_expense_sources

Schema: `public`

## Primary Key

- `id` (finance_expense_sources_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_hotel_reservations

Schema: `public`

## Primary Key

- `id` (finance_hotel_reservations_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO | nextval('finance_hotel_reservations_id_seq'::regclass) | YES |
| reservation_number | text | YES |  |  |
| guest_name | text | YES |  |  |
| room | text | YES |  |  |
| room_type | text | YES |  |  |
| check_in | date | YES |  |  |
| check_out | date | YES |  |  |
| nights | integer | YES |  |  |
| booking_source | text | YES |  |  |
| status | text | YES |  |  |
| accommodation_total | numeric | YES | 0 |  |
| grand_total | numeric | YES | 0 |  |
| amount_paid | numeric | YES | 0 |  |
| balance_due | numeric | YES | 0 |  |
| import_key | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| total_sales | numeric | YES | 0 |  |
| unpaid_balance | numeric | YES | 0 |  |
| payment_method | text | YES |  |  |

---

# finance_hotel_revenue

Schema: `public`

## Primary Key

- `id` (finance_hotel_revenue_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO | nextval('finance_hotel_revenue_id_seq'::regclass) | YES |
| transaction_datetime | timestamp with time zone | YES |  |  |
| service_date | date | YES |  |  |
| room | text | YES |  |  |
| room_type | text | YES |  |  |
| guest_name | text | YES |  |  |
| reservation_number | text | YES |  |  |
| transaction_code | text | YES |  |  |
| description | text | YES |  |  |
| payment_method | text | YES |  |  |
| check_in | date | YES |  |  |
| check_out | date | YES |  |  |
| status | text | YES |  |  |
| note | text | YES |  |  |
| debit | numeric | YES | 0 |  |
| credit | numeric | YES | 0 |  |
| source_file | text | YES |  |  |
| import_key | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# finance_payment_methods

Schema: `public`

## Primary Key

- `id` (finance_payment_methods_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp without time zone | YES | now() |  |
| deduct_from_cash_flow | boolean | YES | false |  |
| requires_approval | boolean | YES | false |  |
| requires_liquidation | boolean | YES | false |  |
| requires_drawer | boolean | YES | false |  |
| return_destination_enabled | boolean | YES | false |  |

---

# finance_payment_sources

Schema: `public`

## Primary Key

- `id` (finance_payment_sources_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | YES |  |  |
| name | text | NO |  |  |
| code | text | NO |  |  |
| deduct_from_cash_flow | boolean | YES | false |  |
| creates_expense_record | boolean | YES | true |  |
| requires_approval | boolean | YES | false |  |
| requires_liquidation | boolean | YES | false |  |
| is_active | boolean | YES | true |  |
| sort_order | integer | YES | 0 |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# finance_revenue_sources

Schema: `public`

## Primary Key

- `id` (finance_revenue_sources_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# finance_settings

Schema: `public`

## Primary Key

- `id` (finance_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| setting_key | text | NO |  |  |
| setting_value | text | NO | ''::text |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# finance_workflow_settings

Schema: `public`

## Primary Key

- `id` (finance_workflow_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| require_expense_approval | boolean | YES | true |  |
| enable_liquidation_tracking | boolean | YES | true |  |
| allow_direct_cash_release | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | now() |  |
| enable_cash_management | boolean | YES | true |  |

---

# forecasting_settings

Schema: `public`

## Primary Key

- `id` (forecasting_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| setting_name | text | NO |  |  |
| setting_data | jsonb | NO |  |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# hc_rule_settings

Schema: `public`

## Primary Key

- `id` (hc_rule_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| setting_name | text | NO |  |  |
| setting_data | jsonb | NO |  |  |
| updated_at | timestamp without time zone | YES | now() |  |

---

# hc_rules

Schema: `public`

## Primary Key

- `id` (hc_rules_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| department | text | NO |  |  |
| min_occupancy | integer | NO |  |  |
| max_occupancy | integer | NO |  |  |
| required_hc | integer | NO |  |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# leave_requests

Schema: `public`

## Primary Key

- `id` (leave_requests_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| employee_id | uuid | YES |  |  |
| leave_type | text | YES |  |  |
| start_date | date | YES |  |  |
| end_date | date | YES |  |  |
| days | integer | YES |  |  |
| reason | text | YES |  |  |
| status | text | YES | 'Pending'::text |  |
| approved_by | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| employee_name | text | YES |  |  |
| department | text | YES |  |  |
| position | text | YES |  |  |
| approved_at | timestamp with time zone | YES |  |  |
| rejected_by | text | YES |  |  |
| rejected_at | timestamp with time zone | YES |  |  |
| rejection_reason | text | YES |  |  |
| employee_no | text | YES |  |  |
| total_days | numeric | YES |  |  |
| requested_by | text | YES |  |  |
| requested_at | timestamp with time zone | YES |  |  |
| cancelled_by | text | YES |  |  |
| cancelled_at | timestamp with time zone | YES |  |  |
| cancellation_reason | text | YES |  |  |
| company_id | uuid | NO |  |  |
| reference_no | text | YES |  |  |

---

# leave_settings

Schema: `public`

## Primary Key

- `id` (leave_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| leave_type | text | NO |  |  |
| default_credits | integer | YES | 0 |  |
| is_enabled | boolean | YES | true |  |
| requires_credits | boolean | YES | false |  |
| created_at | timestamp without time zone | YES | now() |  |

---

# occupancy_data

Schema: `public`

## Primary Key

- `id` (occupancy_data_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| business_date | date | NO |  |  |
| rooms_sold | integer | YES | 0 |  |
| capacity | integer | YES | 0 |  |
| blocked_rooms | integer | YES | 0 |  |
| out_of_service_rooms | integer | YES | 0 |  |
| available_rooms | integer | YES | 0 |  |
| adjusted_occupancy | numeric | YES | 0 |  |
| occupancy | numeric | YES | 0 |  |
| room_revenue | numeric | YES | 0 |  |
| other_revenue | numeric | YES | 0 |  |
| total_revenue | numeric | YES | 0 |  |
| adr | numeric | YES | 0 |  |
| revpar | numeric | YES | 0 |  |
| taxes | numeric | YES | 0 |  |
| fees | numeric | YES | 0 |  |
| source | text | YES | 'Cloudbeds CSV'::text |  |
| uploaded_at | timestamp without time zone | YES | now() |  |

---

# onboarding_settings

Schema: `public`

## Primary Key

- `id` (onboarding_settings_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| is_registration_open | boolean | NO | false |  |
| closed_message | text | NO | 'Employee onboarding is currently closed. Please contact HR.'::text |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

---

# ota_statement_lines

Schema: `public`

## Primary Key

- `id` (ota_statement_lines_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| company_id | uuid | NO |  |  |
| channel | text | NO |  |  |
| line_type | text | YES |  |  |
| statement_date | date | YES |  |  |
| payout_date | date | YES |  |  |
| payout_id | text | YES |  |  |
| reference_code | text | YES |  |  |
| confirmation_code | text | YES |  |  |
| booking_number | text | YES |  |  |
| guest_name | text | YES |  |  |
| check_in | date | YES |  |  |
| check_out | date | YES |  |  |
| nights | numeric | YES |  |  |
| currency | text | YES | 'PHP'::text |  |
| gross_amount | numeric | YES | 0 |  |
| commission_amount | numeric | YES | 0 |  |
| service_fee | numeric | YES | 0 |  |
| vat_amount | numeric | YES | 0 |  |
| cleaning_fee | numeric | YES | 0 |  |
| tax_amount | numeric | YES | 0 |  |
| net_payout | numeric | YES | 0 |  |
| paid_out | numeric | YES | 0 |  |
| details | text | YES |  |  |
| import_key | text | NO |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

---

# payment_sources

Schema: `public`

## Primary Key

- `id` (payment_sources_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# payroll_adjustments

Schema: `public`

## Primary Key

- `id` (payroll_adjustments_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| period_id | uuid | NO |  |  |
| employee_id | uuid | NO |  |  |
| employee_name | text | YES |  |  |
| adjustment_type | text | NO |  |  |
| adjustment_direction | text | NO |  |  |
| amount | numeric | YES | 0 |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| source_module | text | YES |  |  |
| source_id | text | YES |  |  |
| payroll_deducted | boolean | YES | false |  |
| status | text | YES | 'Pending'::text |  |
| approved_at | timestamp with time zone | YES |  |  |
| rejected_at | timestamp with time zone | YES |  |  |

---

# payroll_deduction_types

Schema: `public`

## Primary Key

- `id` (payroll_deduction_types_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| name | text | NO |  |  |
| description | text | YES |  |  |
| is_active | boolean | YES | true |  |
| is_employee_related | boolean | YES | false |  |
| is_payroll_deductible | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# payroll_holidays

Schema: `public`

## Primary Key

- `id` (payroll_holidays_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | bigint | NO |  | YES |
| holiday_name | text | NO |  |  |
| holiday_date | date | NO |  |  |
| holiday_type | text | NO | 'Regular'::text |  |
| multiplier | numeric | YES | 1 |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |

---

# payroll_periods

Schema: `public`

## Primary Key

- `id` (payroll_periods_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| period_name | text | NO |  |  |
| start_date | date | NO |  |  |
| end_date | date | NO |  |  |
| status | text | YES | 'Draft'::text |  |
| created_at | timestamp with time zone | YES | now() |  |
| released_at | timestamp with time zone | YES |  |  |
| reopened_at | timestamp with time zone | YES |  |  |
| reopen_reason | text | YES |  |  |
| needs_regeneration | boolean | YES | false |  |
| last_generated_at | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| attendance_locked | boolean | YES | false |  |
| attendance_locked_at | timestamp with time zone | YES |  |  |
| snapshot_created_at | timestamp with time zone | YES |  |  |
| company_id | uuid | NO |  |  |
| reference_no | text | YES |  |  |

---

# payroll_records

Schema: `public`

## Primary Key

- `id` (payroll_records_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| period_id | uuid | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_no | text | YES |  |  |
| employee_name | text | YES |  |  |
| department | text | YES |  |  |
| position | text | YES |  |  |
| rate_type | text | YES |  |  |
| basic_rate | numeric | YES | 0 |  |
| days_worked | numeric | YES | 0 |  |
| weeks_worked | numeric | YES | 0 |  |
| late_minutes | numeric | YES | 0 |  |
| undertime_minutes | numeric | YES | 0 |  |
| absent_days | numeric | YES | 0 |  |
| basic_pay | numeric | YES | 0 |  |
| holiday_pay | numeric | YES | 0 |  |
| ot_pay | numeric | YES | 0 |  |
| allowance | numeric | YES | 0 |  |
| late_deduction | numeric | YES | 0 |  |
| undertime_deduction | numeric | YES | 0 |  |
| absent_deduction | numeric | YES | 0 |  |
| manual_deduction | numeric | YES | 0 |  |
| total_deductions | numeric | YES | 0 |  |
| gross_pay | numeric | YES | 0 |  |
| net_pay | numeric | YES | 0 |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| ot_minutes | numeric | YES | 0 |  |
| scheduled_days | numeric | YES | 0 |  |
| rest_days | numeric | YES | 0 |  |
| holiday_worked_dates | jsonb | YES | '[]'::jsonb |  |
| payslip_status | text | YES | 'Not Released'::text |  |
| payslip_email_status | text | YES | 'Not Sent'::text |  |
| payslip_released_at | timestamp with time zone | YES |  |  |
| status | text | YES | 'Draft'::text |  |
| period_label | text | YES |  |  |
| reopen_reason | text | YES |  |  |
| released_at | timestamp with time zone | YES |  |  |
| reopened_at | timestamp with time zone | YES |  |  |
| released_by | text | YES |  |  |
| paid_amount | numeric | YES | 0 |  |
| carry_forward_amount | numeric | YES | 0 |  |
| balance_deduction | numeric | YES | 0 |  |
| release_amount | numeric | YES | 0 |  |
| sss_deduction | numeric | YES | 0 |  |
| philhealth_deduction | numeric | YES | 0 |  |
| pagibig_deduction | numeric | YES | 0 |  |
| tax_deduction | numeric | YES | 0 |  |
| sss_mode | text | YES | 'Manual'::text |  |
| philhealth_mode | text | YES | 'Manual'::text |  |
| pagibig_mode | text | YES | 'Manual'::text |  |
| tax_mode | text | YES | 'Manual'::text |  |
| snapshot_created_at | timestamp with time zone | YES |  |  |
| remaining_amount | numeric | YES | 0 |  |
| release_status | text | YES | 'Pending'::text |  |
| remaining_payroll_balance | numeric | YES | 0 |  |
| company_id | uuid | NO |  |  |
| detected_ot_minutes | numeric | YES | 0 |  |
| approved_ot_minutes | numeric | YES | 0 |  |
| ot_approval_status | text | YES | 'NOT_REQUIRED'::text |  |
| record_status | text | YES | 'DRAFT'::text |  |
| return_reason | text | YES |  |  |
| returned_at | timestamp with time zone | YES |  |  |
| returned_by | text | YES |  |  |
| resubmitted_at | timestamp with time zone | YES |  |  |
| resubmitted_by | text | YES |  |  |
| locked_at | timestamp with time zone | YES |  |  |
| locked_by | text | YES |  |  |

---

# payroll_release_history

Schema: `public`

## Primary Key

- `id` (payroll_release_history_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| payroll_record_id | uuid | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_no | text | YES |  |  |
| employee_name | text | YES |  |  |
| department | text | YES |  |  |
| period_id | uuid | YES |  |  |
| cutoff_label | text | YES |  |  |
| gross_pay | numeric | YES | 0 |  |
| total_deductions | numeric | YES | 0 |  |
| net_pay | numeric | YES | 0 |  |
| released_amount | numeric | YES | 0 |  |
| carry_forward_amount | numeric | YES | 0 |  |
| released_by | text | YES |  |  |
| released_at | timestamp with time zone | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| company_id | uuid | NO |  |  |

---

# payroll_release_transactions

Schema: `public`

## Primary Key

- `id` (payroll_release_transactions_pkey)

## Columns

| Name | Type | Nullable | Default | Primary Key |
|------|------|----------|----------|-------------|
| id | uuid | NO | gen_random_uuid() | YES |
| payroll_record_id | uuid | YES |  |  |
| payroll_period_id | uuid | YES |  |  |
| employee_id | uuid | YES |  |  |
| employee_name | text | YES |  |  |
| net_pay | numeric | YES | 0 |  |
| release_amount | numeric | YES | 0 |  |
| remaining_balance | numeric | YES | 0 |  |
| release_batch | text | YES |  |  |
| released_by | text | YES |  |  |
| remarks | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| company_id | uuid | NO |  |  |
| released_at | timestamp with time zone | YES |  |  |
| payment_method | text | YES |  |  |

---

# payroll_settings

Schema: `public`

## Primary Key

- `id` (payroll_settings_pkey)

---

# payroll_snapshot_items

Schema: `public`

## Primary Key

- `id` (payroll_snapshot_items_pkey)

---

# payroll_snapshots

Schema: `public`

## Primary Key

- `id` (payroll_snapshots_pkey1)

---

# payroll_snapshots_old_wrong

Schema: `public`

## Primary Key

- `id` (payroll_snapshots_pkey)

---

# peak_day_rules

Schema: `public`

## Primary Key

- `id` (peak_day_rules_pkey)

---

# performance_history

Schema: `public`

## Primary Key

- `id` (performance_history_pkey)

---

# performance_kpi_settings

Schema: `public`

## Primary Key

- `id` (performance_kpi_settings_pkey)

---

# pos_categories

Schema: `public`

## Primary Key

- `id` (pos_categories_pkey)

---

# pos_categories_backup_20260620

Schema: `public`

---

# pos_menu_groups

Schema: `public`

## Primary Key

- `id` (pos_menu_groups_pkey)

---

# pos_menu_items

Schema: `public`

## Primary Key

- `id` (pos_menu_items_pkey)

---

# pos_menu_items_backup_20260620

Schema: `public`

---

# pos_modifier_groups

Schema: `public`

## Primary Key

- `id` (pos_modifier_groups_pkey)

---

# pos_modifier_options

Schema: `public`

## Primary Key

- `id` (pos_modifier_options_pkey)

---

# pos_modifier_templates

Schema: `public`

## Primary Key

- `id` (pos_modifier_templates_pkey)

---

# pos_order_item_modifiers

Schema: `public`

## Primary Key

- `id` (pos_order_item_modifiers_pkey)

---

# pos_order_items

Schema: `public`

## Primary Key

- `id` (pos_order_items_pkey)

---

# pos_order_types

Schema: `public`

## Primary Key

- `id` (pos_order_types_pkey)

---

# pos_orders

Schema: `public`

## Primary Key

- `id` (pos_orders_pkey)

---

# pos_payment_methods

Schema: `public`

## Primary Key

- `id` (pos_payment_methods_pkey)

---

# pos_payments

Schema: `public`

## Primary Key

- `id` (pos_payments_pkey)

---

# pos_product_modifier_templates

Schema: `public`

## Primary Key

- `id` (pos_product_modifier_templates_pkey)

---

# pos_production_stations

Schema: `public`

## Primary Key

- `id` (pos_production_stations_pkey)

---

# pos_production_stations_backup_20260620

Schema: `public`

---

# pos_sessions

Schema: `public`

## Primary Key

- `id` (pos_sessions_pkey)

---

# pos_settings

Schema: `public`

## Primary Key

- `id` (pos_settings_pkey)

---

# pos_setup_pack_groups

Schema: `public`

## Primary Key

- `id` (pos_setup_pack_groups_pkey)

---

# pos_setup_packs

Schema: `public`

## Primary Key

- `id` (pos_setup_packs_pkey)

---

# pos_tables

Schema: `public`

## Primary Key

- `id` (pos_tables_pkey)

---

# pos_template_modifier_groups

Schema: `public`

## Primary Key

- `id` (pos_template_modifier_groups_pkey)

---

# pos_voids

Schema: `public`

## Primary Key

- `id` (pos_voids_pkey)

---

# positions

Schema: `public`

## Primary Key

- `id` (positions_pkey)

---

# released_payroll_items

Schema: `public`

## Primary Key

- `id` (released_payroll_items_pkey)

---

# released_payrolls

Schema: `public`

## Primary Key

- `id` (released_payrolls_pkey)

---

# restaurant_sales

Schema: `public`

## Primary Key

- `id` (restaurant_sales_pkey)

---

# role_permissions

Schema: `public`

## Primary Key

- `id` (role_permissions_pkey)

---

# schedule_overrides

Schema: `public`

## Primary Key

- `id` (schedule_overrides_pkey)

---

# schedule_publications

Schema: `public`

## Primary Key

- `id` (schedule_publications_pkey)

---

# schedules

Schema: `public`

## Primary Key

- `id` (schedules_pkey)

---

# shift_templates

Schema: `public`

## Primary Key

- `id` (shift_templates_pkey)

---

# system_roles

Schema: `public`

## Primary Key

- `id` (system_roles_pkey)

---

# system_users

Schema: `public`

## Primary Key

- `id` (system_users_pkey)

---

# watcher_findings

Schema: `public`

## Primary Key

- `id` (watcher_findings_pkey)

---

# watcher_request_type_mapping

Schema: `public`

## Primary Key

- `request_type` (watcher_request_type_mapping_pkey)

---
