# OKE Architecture

## Flow

```text
CLI
↓
Command Registry
↓
Commands
↓
Analyzers / Managers
↓
Coordinator
↓
Orchestrator
↓
Specialists
↓
Knowledge
↓
Parsers
↓
Workspace
↓
Reports
↓
Export
↓
Release
```

## Core Folders

- OKE/commands: CLI command entry points.
- OKE/registry: command discovery and dispatch.
- OKE/analyzers: engineering analyzers.
- OKE/knowledge: maps and future knowledge graph.
- OKE/parsers: Source Book and Database Book parsers.
- OKE/specialists: domain specialists.
- OKE/export: continuity package generator.
- OKE/workspace: generated reports and snapshots.
