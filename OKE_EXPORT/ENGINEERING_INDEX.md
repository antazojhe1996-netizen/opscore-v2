# ENGINEERING INDEX

This document is not a simple table of contents.

It explains how the OPSCORE Knowledge Engine (OKE) is organized and how engineering work flows through the system.

## Engineering Overview

OPSCORE is the business platform.

OKE is the Engineering Operating System.

OKE manages engineering knowledge, quality, continuity, and workflow.

Documentation is only one component of OKE.

## OKE Components

### Commands
Execute engineering workflows such as doctor, dependency, export, release, and validate-export.

### Analyzers
Inspect project health, dependency flow, registry integrity, specialists, and export readiness.

### Specialists
Provide domain-specific engineering knowledge for modules like cash, approval, payroll, finance, POS, and reports.

### Knowledge Base
Preserves architecture, workflow, roadmap, history, rules, and engineering decisions.

### Export System
Generates engineering continuity packages containing docs, reports, source books, database books, trees, and OKE source.

### Release Pipeline
The standard release command is:

```powershell
py -m OKE release
```

Release flow:

Source Book
↓
Engineering Trees
↓
Doctor
↓
Dependency
↓
Specialists
↓
Export
↓
Validation
↓
READY FOR NEW CHAT

## Reading Order

1. 00_START_HERE.md
2. START_HERE.md
3. COMPASS.md
4. CURRENT_MISSION.md
5. README.md
6. AI_CONTEXT.md
7. PROJECT_SUMMARY.md
8. ENGINEERING_STATUS.md
9. Engineering Books
10. Reports
11. OPSCORE_SOURCE_BOOK.md
12. OPSCORE_DATABASE_BOOK.md
13. OKE/

## Core Rule

Audit first. Understand before modifying. Never duplicate existing functionality.

The package is considered ready only when the release pipeline reports:

READY FOR NEW CHAT
