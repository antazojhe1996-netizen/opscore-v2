from pathlib import Path

from OKE.analyzers.dependency_analyzer import DependencyAnalyzer
from OKE.analyzers.registry_analyzer import RegistryAnalyzer
from OKE.analyzers.specialist_analyzer import SpecialistAnalyzer


class DoctorAnalyzer:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())

    def analyze(self):
        dependency = DependencyAnalyzer(self.root).analyze()
        registry = RegistryAnalyzer(self.root).analyze()
        specialists = SpecialistAnalyzer(self.root).analyze()

        issues = []
        warnings = []
        recommendations = []

        self.evaluate_registry(registry, issues, warnings, recommendations)
        self.evaluate_dependency(dependency, issues, warnings, recommendations)
        self.evaluate_specialists(specialists, issues, warnings, recommendations)
        self.evaluate_source_books(issues, warnings, recommendations)

        readiness = self.calculate_readiness(
            dependency=dependency,
            registry=registry,
            specialists=specialists,
            issues=issues,
            warnings=warnings,
        )

        verdict = self.verdict(readiness, issues)

        return {
            "score": readiness["engineering_readiness"],
            "status": verdict["status"],
            "verdict": verdict,
            "readiness": readiness,
            "issues": issues,
            "warnings": warnings,
            "recommendations": recommendations,
            "dependency": dependency,
            "registry": registry,
            "specialists": specialists,
        }

    def evaluate_registry(self, registry, issues, warnings, recommendations):
        if registry["orphan_count"] > 0:
            issues.append({
                "area": "Registry",
                "severity": "critical",
                "message": f"{registry['orphan_count']} command(s) are not registered.",
            })
            recommendations.append("Register or remove orphan commands.")

        if registry["score"] < 100:
            warnings.append({
                "area": "Registry",
                "severity": "warning",
                "message": "Command registry integrity is below 100%.",
            })

    def evaluate_dependency(self, dependency, issues, warnings, recommendations):
        for layer in dependency["layers"]:
            if layer["status"] == "MISSING":
                issues.append({
                    "area": "Dependency",
                    "severity": "critical",
                    "message": f"{layer['name']} layer is missing.",
                })

            if layer["status"] == "PARTIAL":
                warnings.append({
                    "area": "Dependency",
                    "severity": "warning",
                    "message": f"{layer['name']} layer is partial.",
                })

        if dependency["score"] < 100:
            recommendations.append(
                "Review dependency chain before using OKE as primary engineering dependency."
            )

    def evaluate_specialists(self, specialists, issues, warnings, recommendations):
        summary = specialists["summary"]

        orphan = summary.get("ORPHAN", 0)
        skeleton = summary.get("SKELETON", 0)
        partial = summary.get("PARTIAL", 0)

        if orphan > 0:
            warnings.append({
                "area": "Specialists",
                "severity": "warning",
                "message": f"{orphan} specialist(s) are orphan.",
            })
            recommendations.append(
                "Review orphan specialists and decide whether to implement, convert to placeholder, or remove."
            )

        if skeleton > 0:
            warnings.append({
                "area": "Specialists",
                "severity": "warning",
                "message": f"{skeleton} specialist(s) are skeleton.",
            })
            recommendations.append(
                "Review skeleton specialists and define intended role."
            )

        if partial > 0:
            warnings.append({
                "area": "Specialists",
                "severity": "warning",
                "message": f"{partial} specialist(s) are partial.",
            })
            recommendations.append(
                "Complete partial specialists or mark as intentional placeholder."
            )

        if specialists["score"] < 80:
            warnings.append({
                "area": "Specialists",
                "severity": "warning",
                "message": "Specialist integrity is below target.",
            })

    def evaluate_source_books(self, issues, warnings, recommendations):
        source_book = self.root / "OKE_EXPORT" / "OPSCORE_SOURCE_BOOK.md"
        database_book = self.root / "OKE_EXPORT" / "OPSCORE_DATABASE_BOOK.md"

        if not source_book.exists():
            issues.append({
                "area": "Export",
                "severity": "critical",
                "message": "OPSCORE_SOURCE_BOOK.md is missing.",
            })
            recommendations.append("Regenerate Source Book.")

        if not database_book.exists():
            issues.append({
                "area": "Export",
                "severity": "critical",
                "message": "OPSCORE_DATABASE_BOOK.md is missing.",
            })
            recommendations.append("Regenerate Database Book.")

        if source_book.exists() and source_book.stat().st_size == 0:
            issues.append({
                "area": "Export",
                "severity": "critical",
                "message": "OPSCORE_SOURCE_BOOK.md is empty.",
            })

        if database_book.exists() and database_book.stat().st_size == 0:
            issues.append({
                "area": "Export",
                "severity": "critical",
                "message": "OPSCORE_DATABASE_BOOK.md is empty.",
            })

    def calculate_readiness(self, dependency, registry, specialists, issues, warnings):
        architecture_readiness = round(
            registry["score"] * 0.4 +
            dependency["score"] * 0.4 +
            specialists["score"] * 0.2,
            2,
        )

        production_readiness = 100
        if issues:
            production_readiness -= len(issues) * 25

        technical_debt = "LOW"
        if specialists["score"] < 80:
            technical_debt = "MEDIUM"
        if specialists["score"] < 50 or issues:
            technical_debt = "HIGH"

        documentation_readiness = self.documentation_score()
        export_readiness = self.export_score()

        engineering_readiness = round(
            architecture_readiness * 0.45 +
            production_readiness * 0.25 +
            documentation_readiness * 0.15 +
            export_readiness * 0.15,
            2,
        )

        return {
            "engineering_readiness": engineering_readiness,
            "production_readiness": max(0, production_readiness),
            "architecture_readiness": architecture_readiness,
            "documentation_readiness": documentation_readiness,
            "export_readiness": export_readiness,
            "technical_debt": technical_debt,
            "critical_issue_count": len(issues),
            "warning_count": len(warnings),
        }

    def documentation_score(self):
        expected_docs = [
            "OKE/README.md",
            "OKE/VERSION.md",
            "OKE_EXPORT/AI_CONTEXT.md",
            "OKE_EXPORT/COMPASS.md",
            "OKE_EXPORT/CURRENT_MISSION.md",
            "OKE_EXPORT/ENGINEERING_STATUS.md",
        ]

        existing = 0

        for path in expected_docs:
            if (self.root / path).exists():
                existing += 1

        return round((existing / len(expected_docs)) * 100, 2)

    def export_score(self):
        expected_exports = [
            "OKE_EXPORT",
            "OKE_EXPORT/OPSCORE_SOURCE_BOOK.md",
            "OKE_EXPORT/OPSCORE_DATABASE_BOOK.md",
            "OKE_EXPORT/OKE_TREE.txt",
            "OKE_EXPORT/EXPORT_TREE.txt",
        ]

        existing = 0

        for path in expected_exports:
            if (self.root / path).exists():
                existing += 1

        return round((existing / len(expected_exports)) * 100, 2)

    def verdict(self, readiness, issues):
        if issues:
            return {
                "status": "NOT READY",
                "summary": "Critical issues exist. Resolve them before relying on OKE.",
            }

        if readiness["engineering_readiness"] >= 95:
            return {
                "status": "HEALTHY",
                "summary": "OKE core is healthy and safe to continue development.",
            }

        if readiness["engineering_readiness"] >= 80:
            return {
                "status": "NEEDS REVIEW",
                "summary": "OKE core is usable, but warnings should be reviewed before treating it as a full engineering dependency.",
            }

        return {
            "status": "NEEDS REVIEW",
            "summary": "OKE is usable for inspection, but not yet mature enough as a primary engineering dependency.",
        }