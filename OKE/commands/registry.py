from OKE.commands.base_command import BaseCommand
from OKE.commands.analyze_command import AnalyzeCommand

# Import all commands here so they register automatically
from OKE.commands.create_command import CreateCommand


class CommandRegistry:

    def dispatch(self, command_name, args):

        registry = BaseCommand.registry()

        command_class = registry.get(command_name)

        if command_class is None:
            print(f"Unknown command: {command_name}")
            return

        command = command_class()

        return command.execute(args)