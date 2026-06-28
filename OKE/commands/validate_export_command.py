from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.analyzers.export_validator import ExportValidator


class ValidateExportCommand(BaseCommand):
    name = "validate-export"

    def execute(self, args):
        validator = ExportValidator()
        report = validator.validate()

        saved_path = WorkspaceManager().save_report(
            "export_validation",
            report,
        )

        print("=" * 60)
        print("OKE EXPORT VALIDATOR")
        print("=" * 60)
        print()

        for section_name, section in report["sections"].items():
            label = section_name.replace("_", " ").title()
            print(f"{label:25} : {section['status']} ({section['score']}%)")

        print()
        print("-" * 60)
        print(f"AI Readiness              : {report['score']}%")
        print(f"Status                    : {report['status']}")
        print("-" * 60)

        if report["missing"]:
            print()
            print("Missing")
            print("-------")
            for item in report["missing"]:
                print(f"- [{item['section']}] {item['item']}")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)