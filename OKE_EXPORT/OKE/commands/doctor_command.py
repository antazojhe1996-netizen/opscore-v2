from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.analyzers.doctor_analyzer import DoctorAnalyzer


class DoctorCommand(BaseCommand):
    name = "doctor"

    def execute(self, args):
        analyzer = DoctorAnalyzer()
        report = analyzer.analyze()

        saved_path = WorkspaceManager().save_report(
            "doctor_report",
            report,
        )

        readiness = report["readiness"]
        verdict = report["verdict"]

        print("=" * 60)
        print("OKE DOCTOR")
        print("=" * 60)
        print()
        print(f"Engineering Readiness : {readiness['engineering_readiness']}%")
        print(f"Production Readiness  : {readiness['production_readiness']}%")
        print(f"Architecture          : {readiness['architecture_readiness']}%")
        print(f"Documentation         : {readiness['documentation_readiness']}%")
        print(f"Export                : {readiness['export_readiness']}%")
        print(f"Technical Debt        : {readiness['technical_debt']}")
        print()
        print(f"Status                : {report['status']}")
        print(f"Verdict               : {verdict['summary']}")
        print()

        print("Critical Issues")
        print("---------------")
        if report["issues"]:
            for issue in report["issues"]:
                print(f"- [{issue['area']}] {issue['message']}")
        else:
            print("0")

        print()
        print("Warnings")
        print("--------")
        if report["warnings"]:
            for warning in report["warnings"]:
                print(f"- [{warning['area']}] {warning['message']}")
        else:
            print("0")

        print()
        print("Recommendations")
        print("---------------")
        if report["recommendations"]:
            for recommendation in report["recommendations"]:
                print(f"- {recommendation}")
        else:
            print("No recommendations. OKE is healthy.")

        print()
        print("Readiness Inputs")
        print("----------------")
        print(f"Registry    : {report['registry']['score']}%")
        print(f"Dependency  : {report['dependency']['score']}%")
        print(f"Specialists : {report['specialists']['score']}%")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)