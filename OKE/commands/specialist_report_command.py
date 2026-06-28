from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.analyzers.specialist_analyzer import SpecialistAnalyzer


class SpecialistReportCommand(BaseCommand):
    name = "specialist-report"

    def execute(self, args):
        analyzer = SpecialistAnalyzer()
        report = analyzer.analyze()

        saved_path = WorkspaceManager().save_report(
            "specialist_report",
            report,
        )

        print("=" * 60)
        print("OKE SPECIALIST REPORT")
        print("=" * 60)
        print()

        print(f"Score             : {report['score']}%")
        print(f"Total Specialists : {report['summary']['total_specialists']}")
        print()

        for specialist in report["specialists"]:
            print("-" * 60)
            print(specialist["name"])
            print("-" * 60)
            print(f"Status              : {specialist['status']}")
            print(f"Files               : {specialist['file_count']}")
            print(f"Non-empty Files     : {specialist['non_empty_file_count']}")
            print(f"References          : {specialist['reference_count']}")
            print(f"BaseSpecialist Uses : {specialist['base_specialist_count']}")
            print(f"Generator Uses      : {specialist['generator_count']}")
            print()
            print("Parts")
            print("-----")
            print(f"specialist.py : {self.yes_no(specialist['has_specialist_py'])}")
            print(f"pipeline.py   : {self.yes_no(specialist['has_pipeline'])}")
            print(f"analyzer.py   : {self.yes_no(specialist['has_analyzer'])}")
            print(f"service.py    : {self.yes_no(specialist['has_service'])}")
            print(f"knowledge.py  : {self.yes_no(specialist['has_knowledge'])}")
            print(f"model.py      : {self.yes_no(specialist['has_model'])}")
            print(f"rule.py       : {self.yes_no(specialist['has_rule'])}")
            print()

        print("=" * 60)
        print("Saved Report")
        print("------------")
        print(saved_path)

    def yes_no(self, value):
        return "YES" if value else "NO"