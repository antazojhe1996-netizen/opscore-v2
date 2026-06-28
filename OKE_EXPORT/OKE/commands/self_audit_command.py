from pathlib import Path
from datetime import datetime

from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.analyzers.registry_analyzer import RegistryAnalyzer
from OKE.analyzers.specialist_analyzer import SpecialistAnalyzer


class SelfAuditCommand(BaseCommand):
    name = "self-audit"

    def execute(self, args):
        root = Path.cwd()
        oke_dir = root / "OKE"

        checks = {
            "core_files": self.check_paths(root, [
                "OKE/__main__.py",
                "OKE/registry/command_registry.py",
                "OKE/commands/base_command.py",
                "OKE/README.md",
                "OKE/VERSION.md",
            ]),
            "commands": self.check_folder(oke_dir / "commands", "_command.py"),
            "parsers": self.check_folder(oke_dir / "parsers", "_parser.py"),
            "knowledge": self.check_folder(oke_dir / "knowledge", ".py"),
            "templates_export": self.check_folder(
                oke_dir / "templates" / "export",
                ".md",
            ),
            "reports": self.check_folder(
                oke_dir / "workspace" / "reports",
                ".json",
            ),
            "export_package": self.check_paths(root, [
                "OKE_EXPORT/OPSCORE_SOURCE_BOOK.md",
                "OKE_EXPORT/OPSCORE_DATABASE_BOOK.md",
                "OKE_EXPORT/OKE_TREE.txt",
                "OKE_EXPORT/EXPORT_TREE.txt",
                "OKE_EXPORT/AI_CONTEXT.md",
                "OKE_EXPORT/COMPASS.md",
                "OKE_EXPORT/CURRENT_MISSION.md",
                "OKE_EXPORT/ENGINEERING_STATUS.md",
            ]),
        }

        scores = {}
        for section, result in checks.items():
            scores[section] = self.score_section(result)

        level_1_score = round(sum(scores.values()) / len(scores), 2)
        level_2_registry = RegistryAnalyzer(root).analyze()
        level_3_specialists = SpecialistAnalyzer(root).analyze()

        combined_score = round(
            (
                level_1_score
                + level_2_registry["score"]
                + level_3_specialists["score"]
            ) / 3,
            2,
        )

        report = {
            "generated_at": datetime.now().isoformat(),
            "overall_score": combined_score,
            "level_1_structural_score": level_1_score,
            "level_2_registry_score": level_2_registry["score"],
            "level_3_specialist_score": level_3_specialists["score"],
            "scores": scores,
            "checks": checks,
            "level_2_registry": level_2_registry,
            "level_3_specialists": level_3_specialists,
            "status": self.status(combined_score),
            "next_actions": self.next_actions(
                scores,
                level_2_registry,
                level_3_specialists,
            ),
        }

        saved_path = WorkspaceManager().save_report("oke_self_audit", report)

        print("=" * 60)
        print("OKE SELF AUDIT")
        print("=" * 60)
        print()
        print(f"Overall Score : {combined_score}%")
        print(f"Status        : {self.status(combined_score)}")
        print()

        print("Level 1 - Structural Audit")
        print("--------------------------")
        print(f"Score : {level_1_score}%")
        print()

        for section, score in scores.items():
            print(f"{section}: {score}%")

        print()
        print("Level 2 - Registry Integrity")
        print("----------------------------")
        print(f"Score              : {level_2_registry['score']}%")
        print(f"Command Files      : {level_2_registry['command_file_count']}")
        print(f"Command Classes    : {level_2_registry['command_class_count']}")
        print(f"Registered Commands: {level_2_registry['registered_count']}")
        print(f"Orphan Commands    : {level_2_registry['orphan_count']}")

        if level_2_registry["orphan_commands"]:
            print()
            print("Orphan Commands")
            print("---------------")
            for item in level_2_registry["orphan_commands"]:
                print(f"- {item.get('class_name')} ({item.get('file')})")

        summary = level_3_specialists["summary"]

        print()
        print("Level 3 - Specialist Integrity")
        print("------------------------------")
        print(f"Score              : {level_3_specialists['score']}%")
        print(f"Total Specialists  : {summary.get('total_specialists', 0)}")
        print(f"Active             : {summary.get('ACTIVE', 0)}")
        print(f"Partial            : {summary.get('PARTIAL', 0)}")
        print(f"Structural         : {summary.get('STRUCTURAL', 0)}")
        print(f"Generated Template : {summary.get('GENERATED_TEMPLATE', 0)}")
        print(f"Placeholder        : {summary.get('PLACEHOLDER', 0)}")
        print(f"Skeleton           : {summary.get('SKELETON', 0)}")
        print(f"Orphan             : {summary.get('ORPHAN', 0)}")

        print()
        print("Next Actions")
        print("------------")
        for action in report["next_actions"]:
            print(f"- {action}")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)

    def check_paths(self, root, relative_paths):
        items = []

        for relative_path in relative_paths:
            path = root / relative_path

            items.append({
                "path": relative_path,
                "exists": path.exists(),
                "size": path.stat().st_size if path.exists() and path.is_file() else 0,
            })

        return {
            "type": "paths",
            "total": len(items),
            "passed": len([item for item in items if item["exists"]]),
            "items": items,
        }

    def check_folder(self, folder, suffix):
        items = []

        if folder.exists():
            for path in sorted(folder.glob(f"*{suffix}")):
                items.append({
                    "path": str(path),
                    "exists": True,
                    "size": path.stat().st_size if path.is_file() else 0,
                })

        return {
            "type": "folder",
            "folder": str(folder),
            "suffix": suffix,
            "exists": folder.exists(),
            "total": len(items),
            "passed": len(items),
            "items": items,
        }

    def score_section(self, result):
        if result["type"] == "paths":
            if result["total"] == 0:
                return 0

            return round((result["passed"] / result["total"]) * 100, 2)

        if result["type"] == "folder":
            if not result["exists"]:
                return 0

            if result["total"] == 0:
                return 50

            return 100

        return 0

    def status(self, overall):
        if overall >= 95:
            return "READY"

        if overall >= 80:
            return "NEEDS REVIEW"

        return "NOT READY"

    def next_actions(self, scores, level_2_registry, level_3_specialists):
        actions = []
        specialist_summary = level_3_specialists["summary"]

        for section, score in scores.items():
            if score < 100:
                actions.append(f"Review {section} ({score}%)")

        if level_2_registry["orphan_count"] > 0:
            actions.append(
                f"Register or remove {level_2_registry['orphan_count']} orphan command(s)."
            )

        if level_2_registry["score"] < 100:
            actions.append("Review command registry integrity.")

        orphan_count = specialist_summary.get("ORPHAN", 0)
        skeleton_count = specialist_summary.get("SKELETON", 0)
        partial_count = specialist_summary.get("PARTIAL", 0)

        if orphan_count > 0:
            actions.append(f"Review {orphan_count} orphan specialist(s).")

        if skeleton_count > 0:
            actions.append(f"Review {skeleton_count} skeleton specialist(s).")

        if partial_count > 0:
            actions.append(f"Review {partial_count} partial specialist(s).")

        if level_3_specialists["score"] < 100:
            actions.append("Review specialist integrity.")

        if not actions:
            actions.append(
                "OKE Level 1, Level 2, and Level 3 audits passed. Proceed to dependency audit."
            )

        return actions