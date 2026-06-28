import subprocess
from pathlib import Path

from OKE.commands.base_command import BaseCommand
from OKE.analyzers.doctor_analyzer import DoctorAnalyzer
from OKE.analyzers.dependency_analyzer import DependencyAnalyzer
from OKE.analyzers.export_validator import ExportValidator
from OKE.analyzers.specialist_analyzer import SpecialistAnalyzer
from OKE.export.export_manager import ExportManager


class ReleaseCommand(BaseCommand):
    name = "release"

    def execute(self, args):
        root = Path.cwd()
        export_dir = root / "OKE_EXPORT"
        zip_path = export_dir / "OPSCORE_FULL_ENGINEERING_PACKAGE.zip"

        results = []

        print("=" * 60)
        print("OKE RELEASE")
        print("=" * 60)
        print()

        results.append(self.run_source_book(root))
        results.append(self.generate_tree(root / "OKE", export_dir / "OKE_TREE.txt", "OKE Tree"))
        results.append(self.generate_tree(export_dir, export_dir / "EXPORT_TREE.txt", "Export Tree"))
        results.append(self.run_doctor())
        results.append(self.run_dependency())
        results.append(self.run_specialists())
        results.append(self.run_export())
        results.append(self.run_validation())

        print()
        print("-" * 60)

        validation = results[-1].get("data", {})
        ai_readiness = validation.get("score", 0)
        status = validation.get("status", "NEEDS REVIEW")

        print(f"AI Readiness : {ai_readiness}%")
        print(f"Status       : {status}")

        if zip_path.exists():
            print(f"ZIP          : {zip_path}")

        print("-" * 60)
        print()

        if status == "READY FOR NEW CHAT" and ai_readiness == 100:
            print("READY FOR NEW CHAT")
            print("Safe to upload ZIP.")
            print()
            print("=" * 60)
            print("UPLOAD THIS FILE")
            print("=" * 60)
            print(zip_path)
            print("=" * 60)
            print()
            self.open_export_folder(export_dir)
        else:
            print("NOT READY FOR NEW CHAT")
            print("Review failed steps before uploading.")

    def open_export_folder(self, export_dir):
        try:
            subprocess.Popen(
                ["explorer", str(export_dir)],
                shell=False,
            )
            print("Opened export folder.")
        except Exception as error:
            print(f"Could not open export folder: {error}")
            print(f"Open manually: {export_dir}")

    def run_source_book(self, root):
        script = root / "scripts" / "export-source-book.ps1"

        if not script.exists():
            return self.print_step(
                "Source Book",
                False,
                "scripts/export-source-book.ps1 not found",
            )

        result = subprocess.run(
            [
                "powershell",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
            ],
            cwd=str(root),
            capture_output=True,
            text=True,
        )

        passed = result.returncode == 0 or "OPSCORE SOURCE BOOK GENERATED" in result.stdout
        message = "generated" if passed else "failed"

        return self.print_step(
            "Source Book",
            passed,
            message,
            {
                "stdout": result.stdout,
                "stderr": result.stderr,
            },
        )

    def generate_tree(self, source, output, label):
        if not source.exists():
            return self.print_step(label, False, f"{source} not found")

        output.parent.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            [
                "cmd",
                "/c",
                "tree",
                str(source),
                "/F",
            ],
            capture_output=True,
            text=True,
        )

        output.write_text(result.stdout, encoding="utf-8", errors="ignore")
        passed = output.exists() and output.stat().st_size > 0

        return self.print_step(label, passed, str(output))

    def run_doctor(self):
        report = DoctorAnalyzer().analyze()
        passed = report.get("status") in ["HEALTHY", "NEEDS REVIEW"]

        return self.print_step(
            "Doctor",
            passed,
            report.get("status"),
            report,
        )

    def run_dependency(self):
        report = DependencyAnalyzer().analyze()
        passed = report.get("status") == "READY"

        return self.print_step(
            "Dependency",
            passed,
            report.get("status"),
            report,
        )

    def run_specialists(self):
        report = SpecialistAnalyzer().analyze()
        passed = report.get("score", 0) >= 50

        return self.print_step(
            "Specialists",
            passed,
            f"{report.get('score')}%",
            report,
        )

    def run_export(self):
        result = ExportManager().export(profile="full")

        return self.print_step(
            "Export",
            result.get("passed"),
            "complete" if result.get("passed") else "failed",
            result,
        )

    def run_validation(self):
        report = ExportValidator().validate()
        passed = (
            report.get("score") == 100
            and report.get("status") == "READY FOR NEW CHAT"
        )

        return self.print_step(
            "Validation",
            passed,
            report.get("status"),
            report,
        )

    def print_step(self, name, passed, message="", data=None):
        status = "PASS" if passed else "FAIL"
        print(f"{name:20} : {status} - {message}")

        return {
            "name": name,
            "passed": passed,
            "message": message,
            "data": data or {},
        }