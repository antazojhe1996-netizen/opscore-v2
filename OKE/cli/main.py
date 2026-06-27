import sys

from OKE.cli.commands import CLICommands


def main():

    if len(sys.argv) < 4:
        print("Usage:")
        print("py -m OKE.cli create specialist <name>")
        return

    command = sys.argv[1]
    target = sys.argv[2]
    name = sys.argv[3]

    cli = CLICommands()

    if command == "create" and target == "specialist":
        cli.create_specialist(name)
        return

    print("Unknown command")


if __name__ == "__main__":
    main()
