# Folder Responsibilities

Version: 1.0

---

## Purpose

Every folder inside OKE has one responsibility.

If a folder starts doing another folder's job, the architecture is degrading.

---

# Core Rule

One folder.

One responsibility.

---

## adapters

Responsible for external integrations.

Examples:

- Supabase
- PostgreSQL
- APIs

---

## analyzers

Analyze information.

Never save.

Never print.

Never orchestrate.

---

## builders

Build engineering objects.

Examples:

- Schema graphs
- Dependency graphs
- Reports

---

## commands

Represent user intent.

Never perform engineering directly.

---

## commander

Dispatch work.

Never analyze.

---

## coordinator

Plan execution.

Never own business logic.

---

## events

Publish runtime events.

Never persist history.

---

## timeline

Store engineering activity history.

Never execute engineering work.

---

## extractors

Extract information.

Never interpret.

---

## generators

Generate code or documentation.

---

## governance

Protect architecture.

Validate engineering rules.

---

## knowledge

Runtime engineering knowledge.

Maps.

Relationships.

Context.

---

## models

Engineering data models.

No business logic.

---

## orchestrator

Coordinates the execution lifecycle.

---

## pipelines

Ordered engineering workflows.

---

## services

Reusable engineering workflows.

---

## specialists

Domain experts.

Every specialist solves one engineering domain.

---

## templates

Templates used by generators.

Never contain project-specific logic.

---

## workspace

Persistent engineering memory.

Reports.

Snapshots.

History.

Artifacts.

---

# Golden Rule

When creating a new folder ask:

"Does an existing folder already own this responsibility?"

If YES,

do not create a new folder.