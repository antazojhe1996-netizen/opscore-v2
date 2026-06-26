# OPSCORE Knowledge Engine (OKE)

## Mission

The OPSCORE Knowledge Engine (OKE) automatically generates living engineering documentation from the OPSCORE source code and database.

OKE exists to eliminate outdated documentation and provide a single source of engineering truth.

---

## Core Philosophy

Documentation is part of the system.

If documentation cannot be regenerated, it is not part of the system.

---

## Workflow

Contract

↓

Template

↓

Generator

↓

Generated Book

---

## Current Modules

✅ Database Book

⬜ Relation Book

⬜ Architecture Book

⬜ Source Validator

⬜ Risk Analyzer

⬜ Knowledge Report

---

## Folder Structure

contracts/

Defines responsibilities and engineering rules.

templates/

Defines output layout.

generators/

Converts data into books.

generated/

Temporary generated artifacts.

cache/

Temporary runtime cache.

---

## Engineering Principles

One Generator = One Responsibility

No Hardcoded Documentation

Generated Files Are Never Edited

Contracts Before Implementation

Templates Own Presentation

Generators Own Logic

---

# OKE Engineering Laws

LAW 001

Every engineering subsystem must have a contract.

LAW 002

Documentation is part of the system.

LAW 003

Generated documentation is never edited manually.

LAW 004

One generator has one responsibility.

LAW 005

Templates own presentation.

Generators own logic.

LAW 006

Every major refactor requires a Knowledge Build.

LAW 007

If OKE cannot understand a feature, the feature is not considered fully complete.

LAW 008

Source Book, Database Book, and Relation Book must always agree.

LAW 009

No guessing.

Always verify against the Source Book and Database Book.

LAW 010

OKE exists to preserve engineering knowledge across time.