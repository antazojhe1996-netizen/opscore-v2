from OKE.commands.base_command import BaseCommand

from OKE.commands.create_command import CreateCommand
from OKE.commands.analyze_command import AnalyzeCommand
from OKE.commands.database_command import DatabaseCommand
from OKE.commands.relation_command import RelationCommand
from OKE.commands.source_command import SourceCommand
from OKE.commands.trace_command import TraceCommand
from OKE.commands.map_command import MapCommand
from OKE.commands.impact_command import ImpactCommand
from OKE.commands.audit_command import AuditCommand
from OKE.commands.self_audit_command import SelfAuditCommand
from OKE.commands.specialist_report_command import SpecialistReportCommand
from OKE.commands.dependency_command import DependencyCommand
from OKE.commands.doctor_command import DoctorCommand
from OKE.commands.export_command import ExportCommand
from OKE.commands.validate_export_command import ValidateExportCommand
from OKE.commands.release_command import ReleaseCommand

class CommandRegistry:

    def dispatch(self, command_name, args):

        registry = BaseCommand.registry()

        command_class = registry.get(command_name)

        if command_class is None:
            print(f"Unknown command: {command_name}")
            print()
            print("Available commands:")
            for name in sorted(registry.keys()):
                print(f"- {name}")
            return

        command = command_class()
        return command.execute(args)