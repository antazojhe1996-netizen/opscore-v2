import json
from pathlib import Path

from OKE.export.manifest_builder import ManifestBuilder
from OKE.export.readme_generator import ReadmeGenerator


class ReviewPackageGenerator:

    def __init__(self):
        self.project_root = Path.cwd()
        self.output_dir = self.project_root / "OKE_EXPORT"

        self.manifest_builder = ManifestBuilder()
        self.readme_generator = ReadmeGenerator()

    def reset_output_dir(self):
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_text(self, filename, content):
        path = self.output_dir / filename
        path.write_text(content, encoding="utf-8")
        return path

    def write_json(self, filename, data):
        path = self.output_dir / filename
        path.write_text(
            json.dumps(data, indent=2),
            encoding="utf-8",
        )
        return path

    def read_report(self, filename):
        path = self.project_root / "OKE" / "workspace" / "reports" / filename

        if not path.exists():
            return None

        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def build_engineering_index(self):
        return "\n".join([
            "# ENGINEERING INDEX",
            "",
            "This document is not a simple table of contents.",
            "",
            "It explains how the OPSCORE Knowledge Engine (OKE) is organized and how engineering work flows through the system.",
            "",
            "## Engineering Overview",
            "",
            "OPSCORE is the business platform.",
            "",
            "OKE is the Engineering Operating System.",
            "",
            "OKE manages engineering knowledge, quality, continuity, and workflow.",
            "",
            "Documentation is only one component of OKE.",
            "",
            "## OKE Components",
            "",
            "### Commands",
            "Execute engineering workflows such as doctor, dependency, export, release, and validate-export.",
            "",
            "### Analyzers",
            "Inspect project health, dependency flow, registry integrity, specialists, and export readiness.",
            "",
            "### Specialists",
            "Provide domain-specific engineering knowledge for modules like cash, approval, payroll, finance, POS, and reports.",
            "",
            "### Knowledge Base",
            "Preserves architecture, workflow, roadmap, history, rules, and engineering decisions.",
            "",
            "### Export System",
            "Generates engineering continuity packages containing docs, reports, source books, database books, trees, and OKE source.",
            "",
            "### Release Pipeline",
            "The standard release command is:",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
            "Release flow:",
            "",
            "Source Book",
            "↓",
            "Engineering Trees",
            "↓",
            "Doctor",
            "↓",
            "Dependency",
            "↓",
            "Specialists",
            "↓",
            "Export",
            "↓",
            "Validation",
            "↓",
            "READY FOR NEW CHAT",
            "",
            "## Reading Order",
            "",
            "1. 00_START_HERE.md",
            "2. START_HERE.md",
            "3. COMPASS.md",
            "4. CURRENT_MISSION.md",
            "5. README.md",
            "6. AI_CONTEXT.md",
            "7. PROJECT_SUMMARY.md",
            "8. ENGINEERING_STATUS.md",
            "9. Engineering Books",
            "10. Reports",
            "11. OPSCORE_SOURCE_BOOK.md",
            "12. OPSCORE_DATABASE_BOOK.md",
            "13. OKE/",
            "",
            "## Core Rule",
            "",
            "Audit first. Understand before modifying. Never duplicate existing functionality.",
            "",
            "The package is considered ready only when the release pipeline reports:",
            "",
            "READY FOR NEW CHAT",
            "",
        ])

    def build_project_summary(self, manifest):
        project = manifest["project"]
        counts = manifest["counts"]

        return "\n".join([
            "# Project Summary",
            "",
            f"Project: {project['name']}",
            f"Full Name: {project['full_name']}",
            f"Type: {project['type']}",
            f"Primary Language: {project['primary_language']}",
            "",
            "## Counts",
            "",
            f"- Commands: {counts['commands']}",
            f"- Specialists: {counts['specialists']}",
            f"- Builders: {counts['builders']}",
            f"- Analyzers: {counts['analyzers']}",
            f"- Pipelines: {counts['pipelines']}",
            f"- Services: {counts['services']}",
            "",
            "## Purpose",
            "",
            "This package introduces OPSCORE and OKE for engineering review, continuity, and new chat onboarding.",
            "",
        ])

    def build_ai_context(self):
        return "\n".join([
            "# AI Context",
            "",
            "You are reviewing OPSCORE and OKE.",
            "",
            "OPSCORE is the business system.",
            "OKE is the Engineering Operating System used to understand, audit, document, and improve OPSCORE.",
            "",
            "Before writing code:",
            "",
            "1. Read 00_START_HERE.md.",
            "2. Read ENGINEERING_INDEX.md.",
            "3. Read manifest.json.",
            "4. Read PROJECT_SUMMARY.md.",
            "5. Read OKE engineering documents.",
            "6. Review source books and architecture docs.",
            "7. Review reports folder.",
            "",
            "Rules:",
            "",
            "- Do not guess.",
            "- Audit first.",
            "- Preserve architecture.",
            "- UI must not contain business logic.",
            "- API routes must be gateways only.",
            "- Engine/service layer owns business logic.",
            "- Do not create duplicate OKE analyzers or commands without checking existing files first.",
            "- OKE is a tool that supports OPSCORE engineering.",
            "",
        ])

    def build_engineering_status(self, manifest):
        status = manifest["status"]
        doctor = self.read_report("doctor_report.json")

        lines = [
            "# Engineering Status",
            "",
            f"- Architecture: {status['architecture']}",
            f"- Foundation: {status['foundation']}",
            f"- Export System: {status['export_system']}",
            "",
        ]

        if doctor:
            readiness = doctor.get("readiness", {})
            lines.extend([
                "## OKE Doctor",
                "",
                f"- Status: {doctor.get('status')}",
                f"- Engineering Readiness: {readiness.get('engineering_readiness')}%",
                f"- Production Readiness: {readiness.get('production_readiness')}%",
                f"- Architecture: {readiness.get('architecture_readiness')}%",
                f"- Technical Debt: {readiness.get('technical_debt')}",
                "",
            ])

        lines.extend([
            "## Current Mission",
            "",
            "Complete the Engineering Continuity Package and ZIP export.",
            "",
            "## Next Validation",
            "",
            "Run the New Chat Test using only the generated package.",
            "",
        ])

        return "\n".join(lines)

    def build_start_here(self):
        return "\n".join([
            "# OKE ENGINEERING BOOTSTRAP PROTOCOL",
            "",
            "# STOP",
            "",
            "Before doing ANY engineering work:",
            "",
            "- Do NOT write code.",
            "- Do NOT suggest architecture changes.",
            "- Do NOT summarize the project after reading only one document.",
            "- Do NOT assume you understand OPSCORE.",
            "",
            "Engineering work begins ONLY after completing this bootstrap.",
            "",
            "# OBJECTIVE",
            "",
            "Your first responsibility is NOT to solve a problem.",
            "",
            "Your first responsibility is to build an accurate mental model of the OPSCORE Engineering Operating System.",
            "",
            "Engineering quality depends on understanding before implementation.",
            "",
            "# WHAT IS OKE?",
            "",
            "OKE is not documentation.",
            "",
            "OKE is an Engineering Operating System.",
            "",
            "It provides:",
            "",
            "- Engineering Memory",
            "- Architecture Knowledge",
            "- Audit Framework",
            "- Command System",
            "- Specialist System",
            "- Dependency Analysis",
            "- Release Pipeline",
            "- Engineering Continuity",
            "- AI Onboarding",
            "- Engineering Validation",
            "",
            "# PHASE 1 — PACKAGE DISCOVERY",
            "",
            "Read:",
            "",
            "- ENGINEERING_INDEX.md",
            "",
            "Goal: Understand the complete engineering package.",
            "",
            "Do NOT summarize the project yet.",
            "",
            "# PHASE 2 — CORE KNOWLEDGE",
            "",
            "Read completely:",
            "",
            "- START_HERE.md",
            "- COMPASS.md",
            "- CURRENT_MISSION.md",
            "- README.md",
            "- AI_CONTEXT.md",
            "- PROJECT_SUMMARY.md",
            "- ENGINEERING_STATUS.md",
            "",
            "# PHASE 3 — ENGINEERING KNOWLEDGE",
            "",
            "Read completely:",
            "",
            "- 01_ENGINEERING_CONSTITUTION.md",
            "- 02_CURRENT_PROJECT_STATE.md",
            "- 03_OKE_COMMAND_REFERENCE.md",
            "- 04_ENGINEERING_WORKFLOW.md",
            "- 05_RECOVERY_GUIDE.md",
            "- 06_ARCHITECTURE.md",
            "- 07_KNOWLEDGE_BASE.md",
            "- 08_NEXT_ROADMAP.md",
            "- 09_CHAT_BOOTSTRAP_PROMPT.md",
            "- 10_OKE_AUDIT_SUMMARY.md",
            "- 11_OKE_ARCHITECTURE_BOOK.md",
            "- 12_OKE_COMMAND_PLAYBOOK.md",
            "- 13_OKE_TRANSITION_GUIDE.md",
            "",
            "# PHASE 4 — ENGINEERING REFERENCES",
            "",
            "Consult when verification or implementation requires evidence:",
            "",
            "- manifest.json",
            "- reports/",
            "- OPSCORE_DATABASE_BOOK.md",
            "- OPSCORE_SOURCE_BOOK.md",
            "- OKE/",
            "",
            "# PHASE 5 — ENGINEERING COMPREHENSION CHECK",
            "",
            "Before implementation, answer ALL:",
            "",
            "1. What is OPSCORE?",
            "2. What is OKE?",
            "3. Explain the OKE architecture.",
            "4. Explain the OKE command system.",
            "5. Explain the OKE specialist system.",
            "6. Explain the OKE release pipeline.",
            "7. Explain the current engineering mission.",
            "8. Explain the current roadmap.",
            "9. Explain the current technical debt.",
            "10. Explain the exact next engineering task.",
            "11. Identify which document supports each answer.",
            "",
            "If uncertain, respond only:",
            "",
            "READING IN PROGRESS",
            "",
            "# PHASE 6 — ENGINEERING RULES",
            "",
            "- Audit first.",
            "- Understand before modifying.",
            "- Preserve architecture.",
            "- Never duplicate existing functionality.",
            "- Never hardcode business rules.",
            "- UI contains no business logic.",
            "- API routes are gateways only.",
            "- Engine / Service layer owns business logic.",
            "- Database is the source of truth.",
            "",
            "Every major milestone ends with:",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
            "Engineering work is complete only when:",
            "",
            "- AI Readiness = 100%",
            "- Status = READY FOR NEW CHAT",
            "",
        ])

    def build_engineering_constitution(self):
        return "\n".join([
            "# OPSCORE / OKE Engineering Constitution",
            "",
            "1. Understand first.",
            "2. Audit before coding.",
            "3. Never assume architecture.",
            "4. Database is the source of truth.",
            "5. Engine/service layer owns business logic.",
            "6. UI must stay thin.",
            "7. API routes must be gateways, not business logic owners.",
            "8. No hardcoded business setup.",
            "9. Reports must not invent data.",
            "10. Every change requires relation, impact, and regression review.",
            "11. Before creating anything in OKE, check whether it already exists.",
            "12. Export the continuity package after every major save/milestone.",
            "",
        ])

    def build_current_project_state(self, manifest):
        counts = manifest["counts"]

        return "\n".join([
            "# Current Project State",
            "",
            "OKE is being developed as the Engineering Operating System for OPSCORE.",
            "",
            "## Current OKE Capabilities",
            "",
            "- Source search",
            "- Trace",
            "- Module map",
            "- Database discovery",
            "- Relation check",
            "- Impact analysis",
            "- Self audit",
            "- Dependency audit",
            "- Specialist report",
            "- Doctor report",
            "- Export packaging",
            "- Export validation",
            "",
            "## Inventory Counts",
            "",
            f"- Commands: {counts['commands']}",
            f"- Specialists: {counts['specialists']}",
            f"- Pipelines: {counts['pipelines']}",
            f"- Services: {counts['services']}",
            f"- Builders: {counts['builders']}",
            f"- Analyzers: {counts['analyzers']}",
            "",
            "## Current Priority",
            "",
            "Finish the Engineering Continuity Package so a new AI chat can continue with only the exported ZIP file.",
            "",
        ])

    def build_command_reference(self):
        return "\n".join([
            "# OKE Command Reference",
            "",
            "Run commands from the project root.",
            "",
            "```powershell",
            "py -m OKE analyze <table_or_target>",
            "py -m OKE audit <module>",
            "py -m OKE create specialist <name>",
            "py -m OKE database all",
            "py -m OKE dependency",
            "py -m OKE doctor",
            "py -m OKE export --full",
            "py -m OKE export --ai",
            "py -m OKE impact <table_or_target>",
            "py -m OKE map <module>",
            "py -m OKE relation <table>",
            "py -m OKE self-audit",
            "py -m OKE source <keyword>",
            "py -m OKE specialist-report",
            "py -m OKE trace <keyword>",
            "py -m OKE validate-export",
            "py -m OKE release",
            "```",
            "",
            "## Continuity Workflow",
            "",
            "After every major milestone:",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
        ])

    def build_engineering_workflow(self):
        return "\n".join([
            "# Engineering Workflow",
            "",
            "## Before Coding",
            "",
            "1. Search existing source.",
            "2. Trace existing classes/functions.",
            "3. Check dependency flow.",
            "4. Run doctor.",
            "5. Decide whether to extend existing code or create a new module.",
            "",
            "## Standard Commands",
            "",
            "```powershell",
            "py -m OKE source <keyword>",
            "py -m OKE trace <keyword>",
            "py -m OKE dependency",
            "py -m OKE doctor",
            "```",
            "",
            "## After Coding",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
            "## Rule",
            "",
            "Do not create duplicate analyzers, commands, exporters, or parsers. Check first, extend second.",
            "",
        ])

    def build_recovery_guide(self):
        return "\n".join([
            "# Recovery Guide",
            "",
            "Use this when moving to a new chat, new laptop, or after losing context.",
            "",
            "## New Chat Recovery",
            "",
            "1. Upload the latest export ZIP.",
            "2. Ask the AI to open 00_START_HERE.md.",
            "3. Ask the AI to follow the Engineering Bootstrap Protocol exactly.",
            "4. Do not allow implementation until the Engineering Comprehension Check is complete.",
            "",
            "## Local Recovery",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
            "## If Export Fails",
            "",
            "Check missing artifacts in the export output, then regenerate or update the profile.",
            "",
        ])

    def build_architecture(self):
        return "\n".join([
            "# OKE Architecture",
            "",
            "## Flow",
            "",
            "```text",
            "CLI",
            "↓",
            "Command Registry",
            "↓",
            "Commands",
            "↓",
            "Analyzers / Managers",
            "↓",
            "Coordinator",
            "↓",
            "Orchestrator",
            "↓",
            "Specialists",
            "↓",
            "Knowledge",
            "↓",
            "Parsers",
            "↓",
            "Workspace",
            "↓",
            "Reports",
            "↓",
            "Export",
            "↓",
            "Release",
            "```",
            "",
            "## Core Folders",
            "",
            "- OKE/commands: CLI command entry points.",
            "- OKE/registry: command discovery and dispatch.",
            "- OKE/analyzers: engineering analyzers.",
            "- OKE/knowledge: maps and future knowledge graph.",
            "- OKE/parsers: Source Book and Database Book parsers.",
            "- OKE/specialists: domain specialists.",
            "- OKE/export: continuity package generator.",
            "- OKE/workspace: generated reports and snapshots.",
            "",
        ])

    def build_knowledge_base(self):
        return "\n".join([
            "# OKE Knowledge Base",
            "",
            "## Current Knowledge Files",
            "",
            "- module_map.py",
            "- regression_map.py",
            "- knowledge_graph.py (placeholder)",
            "- module_graph.py (placeholder)",
            "",
            "## Source of Truth",
            "",
            "- OPSCORE_SOURCE_BOOK.md",
            "- OPSCORE_DATABASE_BOOK.md",
            "- OKE workspace reports",
            "",
            "## Rule",
            "",
            "OKE must not guess. It should use Source Book, Database Book, and reports as evidence.",
            "",
        ])

    def build_next_roadmap(self):
        return "\n".join([
            "# Next Roadmap",
            "",
            "## Completed",
            "",
            "- Structural audit",
            "- Registry audit",
            "- Specialist report",
            "- Dependency audit",
            "- Doctor report",
            "- Export CLI bridge",
            "- Export validator",
            "- Engineering continuity package",
            "- Release command",
            "",
            "## Next",
            "",
            "1. Run blind new-chat ZIP test.",
            "2. Strengthen specialist classifications.",
            "3. Fill or intentionally mark placeholder analyzers.",
            "4. Build runtime audit.",
            "5. Build knowledge graph.",
            "6. Build regression simulator.",
            "7. Return to full OPSCORE engineering audit.",
            "",
        ])

    def build_chat_bootstrap_prompt(self):
        return "\n".join([
            "# Chat Bootstrap Prompt",
            "",
            "Use this prompt in a new chat after uploading the ZIP:",
            "",
            "```text",
            "Open 00_START_HERE.md and follow the Engineering Bootstrap Protocol exactly.",
            "",
            "Do not summarize after reading only one document.",
            "Do not suggest code changes until the Engineering Comprehension Check is complete.",
            "Explain OPSCORE, OKE, architecture, command system, specialist system, release pipeline, current mission, technical debt, and exact next step with supporting documents.",
            "```",
            "",
        ])

    def build_audit_summary(self):
        doctor = self.read_report("doctor_report.json")
        self_audit = self.read_report("oke_self_audit.json")
        dependency = self.read_report("dependency_audit.json")
        export_validation = self.read_report("export_validation.json")

        lines = [
            "# OKE Audit Summary",
            "",
        ]

        if doctor:
            readiness = doctor.get("readiness", {})
            lines.extend([
                "## Doctor",
                "",
                f"- Status: {doctor.get('status')}",
                f"- Engineering Readiness: {readiness.get('engineering_readiness')}%",
                f"- Production Readiness: {readiness.get('production_readiness')}%",
                f"- Technical Debt: {readiness.get('technical_debt')}",
                f"- Critical Issues: {readiness.get('critical_issue_count')}",
                f"- Warnings: {readiness.get('warning_count')}",
                "",
            ])

        if self_audit:
            lines.extend([
                "## Self Audit",
                "",
                f"- Overall Score: {self_audit.get('overall_score')}%",
                f"- Status: {self_audit.get('status')}",
                "",
            ])

        if dependency:
            lines.extend([
                "## Dependency Audit",
                "",
                f"- Score: {dependency.get('score')}%",
                f"- Status: {dependency.get('status')}",
                "",
            ])

        if export_validation:
            lines.extend([
                "## Export Validation",
                "",
                f"- AI Readiness: {export_validation.get('score')}%",
                f"- Status: {export_validation.get('status')}",
                "",
            ])

        lines.extend([
            "## Current Finding",
            "",
            "OKE core is healthy and safe to continue development. Export package is intended to be AI-ready for new chat continuity.",
            "",
        ])

        return "\n".join(lines)

    def build_architecture_book(self):
        return "\n".join([
            "# OKE Architecture Book",
            "",
            "## Bottom-to-Top Architecture",
            "",
            "1. Standards / Rules",
            "2. Models / Events",
            "3. Knowledge / Parsers",
            "4. Extractors / Builders / Services",
            "5. Adapters / Pipelines",
            "6. Specialists",
            "7. Coordinator / Orchestrator",
            "8. Analyzers",
            "9. Commands / Registry",
            "10. Export / Workspace",
            "",
            "## Current Audit Notes",
            "",
            "- Commands and registry are healthy.",
            "- Dependency chain is healthy.",
            "- Export system is real and should be extended, not duplicated.",
            "- Some specialist folders are generated templates or placeholders.",
            "- Some analyzer/knowledge files are placeholders for future work.",
            "",
        ])

    def build_command_playbook(self):
        return "\n".join([
            "# OKE Command Playbook",
            "",
            "## Audit Existing Before Creating",
            "",
            "```powershell",
            "py -m OKE source <keyword>",
            "py -m OKE trace <keyword>",
            "dir OKE\\<folder>",
            "```",
            "",
            "## OKE Health / Release",
            "",
            "```powershell",
            "py -m OKE release",
            "```",
            "",
            "## Export Continuity",
            "",
            "The release command generates, exports, validates, and opens the final package.",
            "",
        ])

    def build_transition_guide(self):
        return "\n".join([
            "# OKE Transition Guide",
            "",
            "## Purpose",
            "",
            "This document allows a new AI chat or engineer to continue without prior conversation memory.",
            "",
            "## What To Do First",
            "",
            "1. Open 00_START_HERE.md.",
            "2. Follow the Engineering Bootstrap Protocol exactly.",
            "3. Complete the Engineering Comprehension Check.",
            "4. Only then continue implementation.",
            "",
            "## Current Rule",
            "",
            "No create/replace unless existing OKE architecture has been checked first.",
            "",
            "## Expected New Chat Behavior",
            "",
            "A new AI should be able to explain OPSCORE, OKE, the current architecture, command system, specialist system, release pipeline, current audit status, and next step using only this package.",
            "",
        ])

    def generate(self):
        self.reset_output_dir()

        manifest = self.manifest_builder.build()

        files = []

        files.append(self.write_text("README.md", self.readme_generator.build()))
        files.append(self.write_json("manifest.json", manifest))
        files.append(self.write_text("ENGINEERING_INDEX.md", self.build_engineering_index()))
        files.append(self.write_text("PROJECT_SUMMARY.md", self.build_project_summary(manifest)))
        files.append(self.write_text("AI_CONTEXT.md", self.build_ai_context()))
        files.append(self.write_text("ENGINEERING_STATUS.md", self.build_engineering_status(manifest)))

        files.append(self.write_text("00_START_HERE.md", self.build_start_here()))
        files.append(self.write_text("01_ENGINEERING_CONSTITUTION.md", self.build_engineering_constitution()))
        files.append(self.write_text("02_CURRENT_PROJECT_STATE.md", self.build_current_project_state(manifest)))
        files.append(self.write_text("03_OKE_COMMAND_REFERENCE.md", self.build_command_reference()))
        files.append(self.write_text("04_ENGINEERING_WORKFLOW.md", self.build_engineering_workflow()))
        files.append(self.write_text("05_RECOVERY_GUIDE.md", self.build_recovery_guide()))
        files.append(self.write_text("06_ARCHITECTURE.md", self.build_architecture()))
        files.append(self.write_text("07_KNOWLEDGE_BASE.md", self.build_knowledge_base()))
        files.append(self.write_text("08_NEXT_ROADMAP.md", self.build_next_roadmap()))
        files.append(self.write_text("09_CHAT_BOOTSTRAP_PROMPT.md", self.build_chat_bootstrap_prompt()))
        files.append(self.write_text("10_OKE_AUDIT_SUMMARY.md", self.build_audit_summary()))
        files.append(self.write_text("11_OKE_ARCHITECTURE_BOOK.md", self.build_architecture_book()))
        files.append(self.write_text("12_OKE_COMMAND_PLAYBOOK.md", self.build_command_playbook()))
        files.append(self.write_text("13_OKE_TRANSITION_GUIDE.md", self.build_transition_guide()))

        return files