from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.analyzers.dependency_analyzer import DependencyAnalyzer


class DependencyCommand(BaseCommand):
    name = "dependency"

    def execute(self, args):
        analyzer = DependencyAnalyzer()
        report = analyzer.analyze()

        saved_path = WorkspaceManager().save_report(
            "dependency_audit",
            report,
        )

        print("=" * 60)
        print("OKE DEPENDENCY AUDIT")
        print("=" * 60)
        print()
        print(f"Score  : {report['score']}%")
        print(f"Status : {report['status']}")
        print()

        print("Flow")
        print("----")
        for index, layer in enumerate(report["flow"]):
            print(layer)
            if index < len(report["flow"]) - 1:
                print("↓")

        print()
        print("Layers")
        print("------")
        for layer in report["layers"]:
            print(f"{layer['name']}: {layer['status']} ({layer['score']}%)")

            if "file_count" in layer:
                print(f"  Files: {layer['file_count']}")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)