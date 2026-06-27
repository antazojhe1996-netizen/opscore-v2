from OKE.commands.base_command import BaseCommand
from OKE.cli.commands import CLICommands


class CreateCommand(BaseCommand):

    name = "create"

    def execute(self, args):

        if len(args) < 2:
            print("Usage:")
            print("py -m OKE create specialist <name>")
            return

        target = args[0]
        name = args[1]

        if target == "specialist":
            CLICommands().create_specialist(name)
            return

        print(f"Unknown create target: {target}")