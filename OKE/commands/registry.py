from OKE.commands.base_command import BaseCommand

# Import all commands here so they register automatically
from OKE.commands.create_command import CreateCommand
from OKE.commands.analyze_command import AnalyzeCommand
from OKE.commands.database_command import DatabaseCommand
from OKE.commands.relation_command import RelationCommand
from OKE.commands.source_command import SourceCommand


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