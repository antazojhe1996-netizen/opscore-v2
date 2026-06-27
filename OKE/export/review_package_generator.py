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
            "1. Read README.md.",
            "2. Read manifest.json.",
            "3. Read PROJECT_SUMMARY.md.",
            "4. Read OKE engineering handbook.",
            "5. Review source books and architecture docs.",
            "",
            "Rules:",
            "",
            "- Do not guess.",
            "- Audit first.",
            "- Preserve architecture.",
            "- UI must not contain business logic.",
            "- API routes must be gateways only.",
            "- OKE is a tool that supports OPSCORE engineering.",
            "",
        ])

    def build_engineering_status(self, manifest):

        status = manifest["status"]

        return "\n".join([
            "# Engineering Status",
            "",
            f"- Architecture: {status['architecture']}",
            f"- Foundation: {status['foundation']}",
            f"- Export System: {status['export_system']}",
            "",
            "## Current Mission",
            "",
            "Complete the Engineering Review Package and ZIP export.",
            "",
            "## Next Validation",
            "",
            "Run the New Chat Test using only the generated package.",
            "",
        ])

    def generate(self):

        self.reset_output_dir()

        manifest = self.manifest_builder.build()

        files = []

        files.append(
            self.write_text(
                "README.md",
                self.readme_generator.build(),
            )
        )

        files.append(
            self.write_json(
                "manifest.json",
                manifest,
            )
        )

        files.append(
            self.write_text(
                "PROJECT_SUMMARY.md",
                self.build_project_summary(manifest),
            )
        )

        files.append(
            self.write_text(
                "AI_CONTEXT.md",
                self.build_ai_context(),
            )
        )

        files.append(
            self.write_text(
                "ENGINEERING_STATUS.md",
                self.build_engineering_status(manifest),
            )
        )

        return files