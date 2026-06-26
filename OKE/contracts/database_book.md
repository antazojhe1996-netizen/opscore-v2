# Database Book Contract

## Module

OPSCORE Knowledge Engine (OKE)

Generator:
generate_database_book.py

Version:
0.1 Alpha

---

# Purpose

The Database Book is the single source of truth for the physical database schema.

It is automatically generated from the live database export.

It must never be edited manually.

---

# Input

Database Schema CSV

Required fields:

- table_schema
- table_name
- ordinal_position
- column_name
- data_type
- udt_name
- is_nullable
- column_default

---

# Output

docs/database-books/

OPSCORE_DATABASE_BOOK_LATEST.md

Versioned copy

OPSCORE_DATABASE_BOOK_YYYY-MM-DD_HH-MM.md

---

# Generator Responsibilities

The generator MUST

✓ Read CSV

✓ Preserve table order

✓ Preserve column order

✓ Preserve nullable

✓ Preserve defaults

✓ Preserve data types

✓ Generate summary

✓ Generate statistics

✓ Generate markdown

---

# Generator MUST NOT

✗ Modify CSV

✗ Guess missing columns

✗ Remove tables

✗ Change field names

✗ Reorder schema

---

# Future Extensions

Reserved

- Foreign Keys

- Indexes

- Policies

- Triggers

- Functions

- Views

- Row Counts

- Related Modules

---

# Engineering Rule

Database Book is generated only.

Never manually edited.