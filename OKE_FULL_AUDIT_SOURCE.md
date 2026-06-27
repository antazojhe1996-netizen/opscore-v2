# OKE Full Audit Source

Files: 189


---

## OKE\__init__.py

```
```

---

## OKE\__main__.py

```
import sys

from OKE.commands.registry import CommandRegistry


def main():

    if len(sys.argv) < 2:
        print("Usage:")
        print("py -m OKE create specialist <name>")
        return

    command_name = sys.argv[1]
    args = sys.argv[2:]

    return CommandRegistry().dispatch(
        command_name=command_name,
        args=args,
    )


if __name__ == "__main__":
    main()
```

---

## OKE\adapters\__init__.py

```
```

---

## OKE\adapters\database_adapter.py

```
from abc import ABC, abstractmethod

from OKE.models.database_schema import DatabaseSchema


class DatabaseAdapter(ABC):
    """
    Base class for every database adapter.

    Every adapter MUST return a DatabaseSchema.
    """

    @abstractmethod
    def load(self) -> DatabaseSchema:
        """
        Load database metadata and return a DatabaseSchema.
        """
        raise NotImplementedError()
```

---

## OKE\adapters\dummy_adapter.py

```
from OKE.models.database_schema import (
    DatabaseSchema,
    DatabaseTable,
    DatabaseColumn,
)

from OKE.adapters.database_adapter import DatabaseAdapter


class DummyAdapter(DatabaseAdapter):

    def load(self) -> DatabaseSchema:

        schema = DatabaseSchema()

        table = DatabaseTable(
            schema="public",
            name="employees",
        )

        table.columns.append(
            DatabaseColumn(
                name="id",
                data_type="uuid",
                nullable=False,
                ordinal_position=1,
            )
        )

        table.columns.append(
            DatabaseColumn(
                name="name",
                data_type="text",
                nullable=False,
                ordinal_position=2,
            )
        )

        table.columns.append(
            DatabaseColumn(
                name="department",
                data_type="text",
                nullable=True,
                ordinal_position=3,
            )
        )

        schema.tables.append(table)

        return schema
```

---

## OKE\adapters\supabase_adapter.py

```
import os

from dotenv import load_dotenv
from supabase import create_client

from OKE.adapters.database_adapter import DatabaseAdapter


class SupabaseAdapter(DatabaseAdapter):
    def __init__(self):
        load_dotenv(".env.local")

        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url:
            raise RuntimeError("SUPABASE_URL missing")

        if not key:
            raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY missing")

        self.client = create_client(url, key)

    def load(self):
        raise NotImplementedError("Supabase schema load not implemented yet")

    def discover_tables(self):
        response = self.client.rpc("oke_discover_tables").execute()
        return response.data

    def discover_columns(self):
        response = self.client.rpc("oke_discover_columns").execute()
        return response.data

    def discover_primary_keys(self):
        response = self.client.rpc("oke_discover_primary_keys").execute()
        return response.data

    def discover_foreign_keys(self):
        response = self.client.rpc("oke_discover_foreign_keys").execute()
        return response.data
```

---

## OKE\aggregators\__init__.py

```
```

---

## OKE\aggregators\result_aggregator.py

```
from dataclasses import dataclass


@dataclass
class AggregatedResult:
    specialists: list[str]
    results: dict


class ResultAggregator:

    def aggregate(self, specialist_results):

        return AggregatedResult(
            specialists=sorted(specialist_results.keys()),
            results=specialist_results,
        )
```

---

## OKE\analyzers\__init__.py

```
```

---

## OKE\analyzers\impact_analyzer.py

```
from dataclasses import dataclass


@dataclass
class ImpactReport:
    table: str
    affected_tables: list[str]
    risk: str


class ImpactAnalyzer:

    def analyze(self, report):

        return ImpactReport(
            table=report.subject,
            affected_tables=sorted(report.dependencies),
            risk=report.risk,
        )
```

---

## OKE\analyzers\module_analyzer.py

```
from dataclasses import dataclass

from OKE.knowledge.module_map import TABLE_MODULES


@dataclass
class ModuleImpact:
    modules: list[str]


class ModuleAnalyzer:

    def analyze(self, report):

        modules = set()

        # Target table
        modules.update(
            TABLE_MODULES.get(report.subject, [])
        )

        # Impacted tables
        for table in report.dependencies:
            modules.update(
                TABLE_MODULES.get(table, [])
            )

        return ModuleImpact(
            modules=sorted(modules)
        )
```

---

## OKE\analyzers\recommendation_analyzer.py

```
from dataclasses import dataclass


@dataclass
class EngineeringRecommendation:
    message: str


class RecommendationAnalyzer:

    def analyze(self, report, impact, module_impact, regression_plan):

        if impact.risk in ["CRITICAL", "HIGH"]:
            return EngineeringRecommendation(
                message=(
                    "High impact change detected. "
                    "Run the full regression checklist before deployment."
                )
            )

        if regression_plan.checklist:
            return EngineeringRecommendation(
                message=(
                    "Moderate impact change. "
                    "Run the listed regression checks before deployment."
                )
            )

        return EngineeringRecommendation(
            message="Low impact change. Basic smoke test is enough."
        )
```

---

## OKE\analyzers\regression_analyzer.py

```
from dataclasses import dataclass

from OKE.knowledge.regression_map import REGRESSION_MAP


@dataclass
class RegressionPlan:
    checklist: list[str]


class RegressionAnalyzer:

    def analyze(self, module_impact):

        checklist = set()

        for module in module_impact.modules:
            checklist.update(
                REGRESSION_MAP.get(module, [])
            )

        return RegressionPlan(
            checklist=sorted(checklist)
        )
```

---

## OKE\builders\__init__.py

```
```

---

## OKE\builders\database_schema_builder.py

```
from OKE.models.database_schema import DatabaseSchema


class DatabaseSchemaBuilder:
    """
    Converts raw database metadata
    into the internal DatabaseSchema model.
    """

    def build(self, metadata) -> DatabaseSchema:
        schema = DatabaseSchema()

        # TODO:
        # Convert metadata into DatabaseSchema

        return schema
```

---

## OKE\builders\dependency_builder.py

```
from OKE.contracts.builder import Builder


class DependencyBuilder(Builder):

    def build(self, relationships):
        dependency_graph = {}

        for parent_table, children in relationships.items():

            dependency_graph[parent_table] = sorted(
                child["table_name"]
                for child in children
            )

        return dependency_graph
```

---

## OKE\builders\relationship_builder.py

```
from OKE.contracts.builder import Builder


class RelationshipBuilder(Builder):

    def build(self, foreign_keys):
        relationships = {}

        for fk in foreign_keys:

            parent = fk["foreign_table_name"]

            child = {
                "table_name": fk["table_name"],
                "column_name": fk["column_name"],
                "foreign_column_name": fk["foreign_column_name"],
            }

            relationships.setdefault(parent, []).append(child)

        return relationships
```

---

## OKE\cli.py

```
import sys

from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.commander.commander import Commander


def print_table_report(table_name):
    adapter = SupabaseAdapter()

    tables = adapter.discover_tables()
    columns = adapter.discover_columns()
    primary_keys = adapter.discover_primary_keys()
    foreign_keys = adapter.discover_foreign_keys()

    table_exists = any(
        table["table_name"] == table_name
        for table in tables
    )

    if not table_exists:
        print(f"Table not found: {table_name}")
        return

    result = Commander().dispatch(
        specialist_name="database",
        action="analyze",
        tables=tables,
        columns=columns,
        primary_keys=primary_keys,
        foreign_keys=foreign_keys,
        table_name=table_name,
    )

    report = result["report"]
    impact = result["impact"]
    modules = result["modules"]
    regression = result["regression"]
    recommendation = result["recommendation"]

    print("=" * 60)
    print("OKE ENGINEERING TABLE REPORT")
    print("=" * 60)
    print()
    print(f"Table      : {report.subject}")
    print(f"Risk Level : {report.risk}")
    print()
    print("Summary")
    print("-------")
    print(f"Columns       : {report.metrics.column_count}")
    print(f"Primary Keys  : {report.metrics.primary_key_count}")
    print(f"Foreign Keys  : {report.metrics.foreign_key_count}")
    print(f"Referenced By : {report.metrics.referenced_by_count}")
    print(f"Dependencies  : {report.metrics.dependency_count}")
    print()

    print("=" * 60)
    print("OKE IMPACT REPORT")
    print("=" * 60)
    print()
    print(f"Target Table        : {impact.table}")
    print(f"Risk Level          : {impact.risk}")
    print(f"Affected Tables     : {len(impact.affected_tables)}")
    print(f"Affected Modules    : {len(modules.modules)}")
    print(f"Regression Checks   : {len(regression.checklist)}")
    print()

    if impact.affected_tables:
        print("Affected Tables")
        print("---------------")
        for table in impact.affected_tables:
            print(f"- {table}")
        print()

    if modules.modules:
        print("Business Impact")
        print("---------------")
        for module in modules.modules:
            print(f"- {module}")
        print()

    if regression.checklist:
        print("Regression Checklist")
        print("--------------------")
        for item in regression.checklist:
            print(f"- {item}")
        print()

    print("Engineering Recommendation")
    print("--------------------------")
    print(recommendation.message)
    print()

    print("Engineering Status: PASS")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  py -m OKE.cli <table_name>")
        return

    table_name = sys.argv[1]
    print_table_report(table_name)


if __name__ == "__main__":
    main()
```

---

## OKE\cli\__init__.py

```
from .main import main

```

---

## OKE\cli\__main__.py

```
from OKE.cli.main import main

main()

```

---

## OKE\cli\commands.py

```
from OKE.generators.specialist_generator import SpecialistGenerator


class CLICommands:

    def create_specialist(self, name):

        generator = SpecialistGenerator()
        path = generator.create(name)

        print("? Specialist created")
        print(path)

```

---

## OKE\cli\main.py

```
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

```

---

## OKE\commander\__init__.py

```
```

---

## OKE\commander\commander.py

```
from OKE.commander.registry import SpecialistRegistry


class Commander:

    def __init__(self):
        self.registry = SpecialistRegistry()

    def dispatch(self, specialist_name, action, **kwargs):

        specialist_class = self.registry.get(specialist_name)
        specialist = specialist_class()

        handler = getattr(specialist, action, None)

        if not handler:
            raise ValueError(
                f"Specialist '{specialist_name}' does not support action: {action}"
            )

        return handler(**kwargs)

    def list_specialists(self):
        return self.registry.list()
```

---

## OKE\commander\registry.py

```
from OKE.specialists.base import BaseSpecialist

# Import specialists para ma-register sila
from OKE.specialists.database.specialist import DatabaseSpecialist


class SpecialistRegistry:

    def get(self, specialist_name):

        registry = BaseSpecialist.registry()

        specialist_class = registry.get(specialist_name)

        if specialist_class is None:
            raise ValueError(
                f"Unknown specialist: {specialist_name}"
            )

        return specialist_class

    def list(self):
        return sorted(BaseSpecialist.registry().keys())
```

---

## OKE\commands\__init__.py

```
```

---

## OKE\commands\analyze_command.py

```
from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.commands.base_command import BaseCommand
from OKE.context import DatabaseContext, EngineeringContext
from OKE.coordinator.coordinator import Coordinator
from OKE.orchestrator.orchestrator import Orchestrator
from OKE.workspace import WorkspaceManager


class AnalyzeCommand(BaseCommand):

    name = "analyze"

    def execute(self, args):

        if len(args) < 1:
            print("Usage:")
            print("py -m OKE analyze <table_name>")
            return

        table_name = args[0]

        adapter = SupabaseAdapter()

        context = EngineeringContext(
            task=f"analyze {table_name} table",
            database=DatabaseContext(
                tables=adapter.discover_tables(),
                columns=adapter.discover_columns(),
                primary_keys=adapter.discover_primary_keys(),
                foreign_keys=adapter.discover_foreign_keys(),
                table_name=table_name,
            ),
        )

        result = Orchestrator().execute(
            Coordinator(),
            task=context.task,
            context=context,
        )

        database_result = result.specialist_results.get("database")

        if not database_result:
            print("No database result.")
            return

        report = database_result["report"]
        impact = database_result["impact"]
        modules = database_result["modules"]
        regression = database_result["regression"]
        recommendation = database_result["recommendation"]

        report_data = {
            "task": context.task,
            "table": report.subject,
            "risk": report.risk,
            "metrics": {
                "columns": report.metrics.column_count,
                "primary_keys": report.metrics.primary_key_count,
                "foreign_keys": report.metrics.foreign_key_count,
                "referenced_by": report.metrics.referenced_by_count,
                "dependencies": report.metrics.dependency_count,
            },
            "impact": {
                "affected_tables": impact.affected_tables,
                "affected_table_count": len(impact.affected_tables),
                "affected_modules": modules.modules,
                "affected_module_count": len(modules.modules),
            },
            "regression": {
                "checklist": regression.checklist,
                "check_count": len(regression.checklist),
            },
            "recommendation": recommendation.message,
        }

        saved_path = WorkspaceManager().save_report(
            table_name,
            report_data,
        )

        print("=" * 60)
        print("OKE ANALYZE REPORT")
        print("=" * 60)
        print()
        print(f"Task : {context.task}")
        print(f"Plan : {result.plan.required_specialists}")
        print()
        print(f"Table      : {report.subject}")
        print(f"Risk Level : {report.risk}")
        print()
        print(f"Affected Tables   : {len(impact.affected_tables)}")
        print(f"Affected Modules  : {len(modules.modules)}")
        print(f"Regression Checks : {len(regression.checklist)}")
        print()
        print("Recommendation")
        print("--------------")
        print(recommendation.message)
        print()
        print("Workspace")
        print("---------")
        print(f"Saved Report : {saved_path}")
```

---

## OKE\commands\base_command.py

```
from abc import ABC, abstractmethod


class BaseCommand(ABC):

    name = "base"

    _registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        if getattr(cls, "name", None) and cls.name != "base":
            BaseCommand._registry[cls.name] = cls

    @classmethod
    def registry(cls):
        return dict(cls._registry)

    @abstractmethod
    def execute(self, args):
        raise NotImplementedError
```

---

## OKE\commands\create_command.py

```
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
```

---

## OKE\commands\registry.py

```
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
```

---

## OKE\context\__init__.py

```
from .database_context import DatabaseContext
from .engineering_context import EngineeringContext
```

---

## OKE\context\database_context.py

```
from dataclasses import dataclass


@dataclass
class DatabaseContext:
    tables: list
    columns: list
    primary_keys: list
    foreign_keys: list
    table_name: str
```

---

## OKE\context\engineering_context.py

```
from dataclasses import dataclass

from OKE.context.database_context import DatabaseContext


@dataclass
class EngineeringContext:
    task: str
    database: DatabaseContext | None = None
```

---

## OKE\contracts\builder.py

```
from abc import ABC, abstractmethod


class Builder(ABC):

    @abstractmethod
    def build(self, *args, **kwargs):
        """Build engineering knowledge."""
        pass
```

---

## OKE\contracts\database_book.md

```
# Database Book Contract

## Module

OPSCORE Knowledge Engine (OKE)

Generator:
generate_database_book.py

Version:
0.1 Alpha

---

# Purpose

The Database Book is the single source of truth for the physical database schema.

It is automatically generated from the live database export.

It must never be edited manually.

---

# Input

Database Schema CSV

Required fields:

- table_schema
- table_name
- ordinal_position
- column_name
- data_type
- udt_name
- is_nullable
- column_default

---

# Output

docs/database-books/

OPSCORE_DATABASE_BOOK_LATEST.md

Versioned copy

OPSCORE_DATABASE_BOOK_YYYY-MM-DD_HH-MM.md

---

# Generator Responsibilities

The generator MUST

✓ Read CSV

✓ Preserve table order

✓ Preserve column order

✓ Preserve nullable

✓ Preserve defaults

✓ Preserve data types

✓ Generate summary

✓ Generate statistics

✓ Generate markdown

---

# Generator MUST NOT

✗ Modify CSV

✗ Guess missing columns

✗ Remove tables

✗ Change field names

✗ Reorder schema

---

# Future Extensions

Reserved

- Foreign Keys

- Indexes

- Policies

- Triggers

- Functions

- Views

- Row Counts

- Related Modules

---

# Engineering Rule

Database Book is generated only.

Never manually edited.
```

---

## OKE\coordinator\__init__.py

```
```

---

## OKE\coordinator\coordinator.py

```
from dataclasses import dataclass

from OKE.aggregators.result_aggregator import ResultAggregator
from OKE.commander.commander import Commander


@dataclass
class CoordinationPlan:
    task: str
    required_specialists: list[str]


class Coordinator:

    def plan(self, task):

        required_specialists = []

        task_lower = task.lower()

        if (
            "database" in task_lower
            or "table" in task_lower
            or "schema" in task_lower
        ):
            required_specialists.append("database")

        return CoordinationPlan(
            task=task,
            required_specialists=required_specialists,
        )

    def execute(self, task, action="analyze", **kwargs):

        plan = self.plan(task)
        commander = Commander()

        specialist_results = {}

        for specialist_name in plan.required_specialists:
            specialist_results[specialist_name] = commander.dispatch(
                specialist_name=specialist_name,
                action=action,
                **kwargs,
            )

        aggregated = ResultAggregator().aggregate(
            specialist_results
        )

        return {
            "plan": plan,
            "aggregated": aggregated,
        }
```

---

## OKE\docs\ENGINEERING_HANDBOOK\01_MISSION.md

```
# OKE Constitution

Version: 1.0

---

# Article I
## Mission

OPSCORE Knowledge Engine (OKE) exists to preserve engineering knowledge.

Software changes should never depend on memory, assumptions, or individual experience.

Every engineering decision should be based on analysis.

OKE was created to help engineers understand systems before changing them.

---

# Article II
## Vision

Create an Engineering Operating System capable of coordinating multiple engineering specialists.

The platform should continue evolving regardless of who maintains it.

Engineering knowledge must survive beyond individual developers.

---

# Article III
## Purpose

OKE does not replace engineers.

OKE amplifies engineers.

Every specialist contributes knowledge.

Every analysis reduces uncertainty.

Every recommendation supports engineering decisions.

---

# Article IV
## Core Philosophy

Understand first.

Analyze second.

Change last.

Never modify a system before understanding its architecture.

Knowledge always comes before implementation.

---

# Article V
## Long-Term Vision

OKE is designed as an Engineering Operating System.

It consists of independent specialists working together.

Examples include:

- Database Specialist
- Source Specialist
- Workflow Specialist
- Security Specialist
- Performance Specialist
- API Specialist
- Documentation Specialist
- AI Specialist

The Coordinator plans.

The Commander dispatches.

Specialists analyze.

Pipelines orchestrate.

Aggregators combine engineering knowledge.

The final output is a unified engineering recommendation.

---

# Article VI
## Knowledge Preservation

Engineering knowledge must never depend on a single person.

Every important architectural decision should be documented.

Every specialist should be understandable.

Every workflow should be reproducible.

The system itself should teach future engineers.

---

# Article VII
## Engineering Culture

Architecture before implementation.

Clarity before cleverness.

Consistency before speed.

Knowledge before assumptions.

Automation before manual work.

Long-term thinking before short-term convenience.

Every commit should improve the system.

---

# Article VIII
## Success

OKE succeeds when a future engineer can continue building the platform without depending on its original creators.

The platform should preserve engineering knowledge.

Not engineering heroes.

---

# Engineering Oath

We build systems that outlive us.

We protect architecture from shortcuts.

We document knowledge before it is forgotten.

We improve every system we touch.

We leave every project better than we found it.

Knowledge is our legacy.
```

---

## OKE\docs\ENGINEERING_HANDBOOK\02_ARCHITECTURE.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\03_ENGINEERING_PRINCIPLES.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\04_HOW_TO_CREATE_SPECIALIST.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\05_HOW_TO_CREATE_ANALYZER.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\06_HOW_PIPELINES_WORK.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\07_CONTRIBUTING.md

```
```

---

## OKE\docs\ENGINEERING_HANDBOOK\08_GLOSSARY.md

```
```

---

## OKE\events\__init__.py

```
from .event_bus import EventBus
from .events import (
    Event,
    EngineeringStarted,
    EngineeringFinished,
    SpecialistStarted,
    SpecialistFinished,
)
```

---

## OKE\events\event_bus.py

```
from collections import defaultdict


class EventBus:

    def __init__(self):

        self.listeners = defaultdict(list)

    def subscribe(
        self,
        event_name,
        callback,
    ):

        self.listeners[event_name].append(callback)

    def publish(
        self,
        event,
    ):

        for callback in self.listeners[event.name]:
            callback(event.payload)
```

---

## OKE\events\events.py

```
from dataclasses import dataclass, field


@dataclass
class Event:

    name: str
    payload: dict = field(default_factory=dict)


@dataclass
class EngineeringStarted(Event):

    def __init__(self, task):
        super().__init__(
            name="engineering.started",
            payload={
                "task": task,
            },
        )


@dataclass
class EngineeringFinished(Event):

    def __init__(self, task, status="PASS"):
        super().__init__(
            name="engineering.finished",
            payload={
                "task": task,
                "status": status,
            },
        )


@dataclass
class SpecialistStarted(Event):

    def __init__(self, specialist):
        super().__init__(
            name="specialist.started",
            payload={
                "specialist": specialist,
            },
        )


@dataclass
class SpecialistFinished(Event):

    def __init__(self, specialist, status="PASS"):
        super().__init__(
            name="specialist.finished",
            payload={
                "specialist": specialist,
                "status": status,
            },
        )
```

---

## OKE\extractors\__init__.py

```
```

---

## OKE\extractors\database_extractor.py

```
from OKE.adapters.database_adapter import DatabaseAdapter
from OKE.models.database_schema import DatabaseSchema


class DatabaseExtractor:

    def __init__(self, adapter: DatabaseAdapter):
        self.adapter = adapter

    def extract(self) -> DatabaseSchema:
        return self.adapter.load()
```

---

## OKE\generators\generate_database_book.py

```
from pathlib import Path


class DatabaseBookGenerator:

    def generate(
        self,
        tables,
        columns=None,
        primary_keys=None,
        foreign_keys=None,
        relationships=None,
    ):

        columns = columns or []
        primary_keys = primary_keys or []
        foreign_keys = foreign_keys or []
        relationships = relationships or {}

        output = []

        output.append("# OPSCORE Database Book")
        output.append("")
        output.append(f"Total Tables: {len(tables)}")
        output.append(f"Total Columns: {len(columns)}")
        output.append(f"Total Primary Keys: {len(primary_keys)}")
        output.append(f"Total Foreign Keys: {len(foreign_keys)}")
        output.append(f"Total Referenced Tables: {len(relationships)}")
        output.append("")
        output.append("---")
        output.append("")
        output.append("## Tables")
        output.append("")

        for table in tables:
            output.append(f"- `{table['table_schema']}.{table['table_name']}`")

        output.append("")
        output.append("---")
        output.append("")

        for table in tables:
            table_name = table["table_name"]

            output.append(f"# {table_name}")
            output.append("")
            output.append(f"Schema: `{table['table_schema']}`")
            output.append("")

            table_primary_keys = [
                pk for pk in primary_keys
                if pk["table_name"] == table_name
            ]

            table_foreign_keys = [
                fk for fk in foreign_keys
                if fk["table_name"] == table_name
            ]

            referenced_by = relationships.get(table_name, [])

            if table_primary_keys:
                output.append("## Primary Key")
                output.append("")

                for pk in table_primary_keys:
                    output.append(
                        f"- `{pk['column_name']}` "
                        f"({pk['constraint_name']})"
                    )

                output.append("")

            if table_foreign_keys:
                output.append("## Foreign Keys")
                output.append("")

                for fk in table_foreign_keys:
                    output.append(
                        f"- `{fk['column_name']}` → "
                        f"`{fk['foreign_table_schema']}.{fk['foreign_table_name']}.{fk['foreign_column_name']}` "
                        f"({fk['constraint_name']})"
                    )

                output.append("")

            if referenced_by:
                output.append("## Referenced By")
                output.append("")

                for ref in referenced_by:
                    output.append(
                        f"- `{ref['table_name']}.{ref['column_name']}` "
                        f"→ `{table_name}.{ref['foreign_column_name']}`"
                    )

                output.append("")

            table_columns = [
                c for c in columns
                if c["table_name"] == table_name
            ]

            if table_columns:
                output.append("## Columns")
                output.append("")
                output.append("| Name | Type | Nullable | Default | Primary Key | Foreign Key |")
                output.append("|------|------|----------|----------|-------------|-------------|")

                pk_columns = {
                    pk["column_name"]
                    for pk in table_primary_keys
                }

                fk_map = {
                    fk["column_name"]: (
                        f"{fk['foreign_table_schema']}."
                        f"{fk['foreign_table_name']}."
                        f"{fk['foreign_column_name']}"
                    )
                    for fk in table_foreign_keys
                }

                for column in table_columns:
                    column_name = column["column_name"]
                    nullable = "YES" if column["is_nullable"] == "YES" else "NO"
                    default = column["column_default"] or ""
                    is_pk = "YES" if column_name in pk_columns else ""
                    fk_target = fk_map.get(column_name, "")

                    output.append(
                        f"| {column_name} | "
                        f"{column['data_type']} | "
                        f"{nullable} | "
                        f"{default} | "
                        f"{is_pk} | "
                        f"{fk_target} |"
                    )

                output.append("")

            output.append("---")
            output.append("")

        destination = Path("docs/database-books/OPSCORE_DATABASE_BOOK.md")
        destination.parent.mkdir(parents=True, exist_ok=True)

        destination.write_text(
            "\n".join(output),
            encoding="utf-8",
        )

        return destination
```

---

## OKE\generators\specialist_generator.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\governance\__init__.py

```
```

---

## OKE\governance\auditor.py

```
```

---

## OKE\governance\report.py

```
from dataclasses import dataclass, field


@dataclass
class GovernanceFinding:
    category: str
    status: str
    message: str


@dataclass
class GovernanceReport:
    findings: list[GovernanceFinding] = field(default_factory=list)

    def is_pass(self):
        return all(
            finding.status == "PASS"
            for finding in self.findings
        )
```

---

## OKE\governance\rules.py

```
from abc import ABC, abstractmethod


class BaseGovernanceRule(ABC):

    name = "base"
    category = "General"

    @abstractmethod
    def validate(self):
        raise NotImplementedError
```

---

## OKE\governance\rules\__init__.py

```
```

---

## OKE\governance\rules\analyzer_rule.py

```
```

---

## OKE\governance\rules\architecture_rule.py

```
```

---

## OKE\governance\rules\base_rule.py

```
from abc import ABC, abstractmethod


class BaseGovernanceRule(ABC):

    name = "base"
    category = "General"

    @abstractmethod
    def validate(self):
        raise NotImplementedError
```

---

## OKE\governance\rules\pipeline_rule.py

```
```

---

## OKE\governance\rules\specialist_rule.py

```
from OKE.governance.report import GovernanceFinding
from OKE.governance.rules.base_rule import BaseGovernanceRule
from OKE.specialists.base import BaseSpecialist


class SpecialistRule(BaseGovernanceRule):

    name = "specialist_contract"
    category = "Specialists"

    def validate(self):

        findings = []

        registry = BaseSpecialist.registry()

        if not registry:
            findings.append(
                GovernanceFinding(
                    category=self.category,
                    status="FAIL",
                    message="No specialists registered.",
                )
            )
            return findings

        for name, specialist_class in registry.items():

            if not hasattr(specialist_class, "analyze"):
                findings.append(
                    GovernanceFinding(
                        category=self.category,
                        status="FAIL",
                        message=f"{name} is missing analyze().",
                    )
                )
                continue

            if not hasattr(specialist_class, "describe"):
                findings.append(
                    GovernanceFinding(
                        category=self.category,
                        status="FAIL",
                        message=f"{name} is missing describe().",
                    )
                )
                continue

            findings.append(
                GovernanceFinding(
                    category=self.category,
                    status="PASS",
                    message=f"{name} specialist passes contract.",
                )
            )

        return findings
```

---

## OKE\governance\validator.py

```
from OKE.governance.rules.specialist_rule import SpecialistRule

# Import specialists to trigger BaseSpecialist auto-registration
from OKE.specialists.database.specialist import DatabaseSpecialist


class GovernanceValidator:

    def __init__(self):

        self.rules = [
            SpecialistRule(),
        ]

    def validate(self):

        findings = []

        for rule in self.rules:
            findings.extend(rule.validate())

        return findings


def main():

    validator = GovernanceValidator()

    findings = validator.validate()

    print("=" * 60)
    print("OKE GOVERNANCE REPORT")
    print("=" * 60)
    print()

    passed = 0
    failed = 0

    for finding in findings:

        print(f"[{finding.status}] {finding.category}")
        print(f"  {finding.message}")
        print()

        if finding.status == "PASS":
            passed += 1
        else:
            failed += 1

    print("-" * 60)
    print(f"PASS : {passed}")
    print(f"FAIL : {failed}")


if __name__ == "__main__":
    main()
```

---

## OKE\knowledge\__init__.py

```
```

---

## OKE\knowledge\module_map.py

```
TABLE_MODULES = {
    "employees": ["Workforce"],
    "attendance_entries": ["Attendance", "Workforce"],
    "biometric_mappings": ["Attendance"],
    "cash_advance_requests": ["Finance", "Payroll"],
    "employee_balances": ["Payroll"],
    "leave_requests": ["Leave", "Workforce"],
    "payroll_records": ["Payroll"],
    "pos_sessions": ["POS"],
    "system_users": ["Security"],
    "cash_drawers": ["Cash Management"],
    "cash_movements": ["Cash Management", "Finance"],
    "companies": ["Core"],
    "approval_requests": ["Approval Center"],
}
```

---

## OKE\knowledge\regression_map.py

```
REGRESSION_MAP = {
    "Workforce": [
        "Create Employee",
        "Edit Employee",
        "Deactivate Employee",
    ],

    "Attendance": [
        "Time In",
        "Time Out",
        "Attendance Import",
    ],

    "Payroll": [
        "Generate Payroll",
        "Release Payroll",
        "Payslip Generation",
    ],

    "Leave": [
        "Leave Request",
        "Leave Approval",
        "Leave Balance",
    ],

    "Finance": [
        "Cash In",
        "Cash Out",
        "Cash Drawer",
    ],

    "POS": [
        "Open Session",
        "Close Session",
        "POS Login",
    ],

    "Security": [
        "User Login",
        "Role Permission",
    ],

    "Approval Center": [
        "Approval Routing",
        "Approval Decision",
    ],

    "Core": [
        "Company Loading",
    ],
}
```

---

## OKE\models\__init__.py

```
```

---

## OKE\models\database_schema.py

```
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DatabaseColumn:
    name: str
    data_type: str
    nullable: bool
    default: Optional[str] = None
    ordinal_position: int = 0


@dataclass
class DatabaseTable:
    schema: str
    name: str
    columns: list[DatabaseColumn] = field(default_factory=list)


@dataclass
class DatabaseSchema:
    tables: list[DatabaseTable] = field(default_factory=list)

    @property
    def total_tables(self):
        return len(self.tables)

    @property
    def total_columns(self):
        return sum(len(t.columns) for t in self.tables)
```

---

## OKE\models\engineering_metrics.py

```
from dataclasses import dataclass


@dataclass
class EngineeringMetrics:
    column_count: int
    primary_key_count: int
    foreign_key_count: int
    referenced_by_count: int
    dependency_count: int
```

---

## OKE\models\engineering_report.py

```
from dataclasses import dataclass, field
from typing import Any

from OKE.models.engineering_metrics import EngineeringMetrics


@dataclass
class EngineeringReport:
    subject: str
    risk: str
    metrics: EngineeringMetrics

    columns: list[dict[str, Any]] = field(default_factory=list)
    primary_keys: list[dict[str, Any]] = field(default_factory=list)
    foreign_keys: list[dict[str, Any]] = field(default_factory=list)
    referenced_by: list[dict[str, Any]] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
```

---

## OKE\orchestrator\__init__.py

```
```

---

## OKE\orchestrator\orchestrator.py

```
from dataclasses import dataclass

from OKE.events import (
    EngineeringFinished,
    EngineeringStarted,
    EventBus,
)


@dataclass
class OrchestratorResult:
    plan: object
    specialist_results: dict
    aggregated: object


class Orchestrator:

    def __init__(self, event_bus=None):

        self.event_bus = event_bus or EventBus()

    def execute(
        self,
        coordinator,
        **kwargs,
    ):

        task = kwargs.pop("task")

        self.event_bus.publish(
            EngineeringStarted(task)
        )

        plan = coordinator.plan(task)

        result = coordinator.execute(
            task,
            **kwargs,
        )

        aggregated = result["aggregated"]

        self.event_bus.publish(
            EngineeringFinished(task)
        )

        return OrchestratorResult(
            plan=plan,
            specialist_results=aggregated.results,
            aggregated=aggregated,
        )
```

---

## OKE\pipelines\__init__.py

```
```

---

## OKE\pipelines\engineering_pipeline.py

```
from OKE.analyzers.impact_analyzer import ImpactAnalyzer
from OKE.analyzers.module_analyzer import ModuleAnalyzer
from OKE.analyzers.recommendation_analyzer import RecommendationAnalyzer
from OKE.analyzers.regression_analyzer import RegressionAnalyzer
from OKE.services.engineering_report_service import EngineeringReportService


class EngineeringPipeline:

    def run(
        self,
        tables,
        columns,
        primary_keys,
        foreign_keys,
        table_name,
    ):

        report = EngineeringReportService().build(
            tables=tables,
            columns=columns,
            primary_keys=primary_keys,
            foreign_keys=foreign_keys,
            table_name=table_name,
        )

        impact = ImpactAnalyzer().analyze(report)

        modules = ModuleAnalyzer().analyze(report)

        regression = RegressionAnalyzer().analyze(modules)

        recommendation = RecommendationAnalyzer().analyze(
            report,
            impact,
            modules,
            regression,
        )

        return {
            "report": report,
            "impact": impact,
            "modules": modules,
            "regression": regression,
            "recommendation": recommendation,
        }
```

---

## OKE\README.md

```
# OPSCORE Knowledge Engine (OKE)

## Mission

The OPSCORE Knowledge Engine (OKE) automatically generates living engineering documentation from the OPSCORE source code and database.

OKE exists to eliminate outdated documentation and provide a single source of engineering truth.

---

## Core Philosophy

Documentation is part of the system.

If documentation cannot be regenerated, it is not part of the system.

---

## Workflow

Contract

↓

Template

↓

Generator

↓

Generated Book

---

## Current Modules

✅ Database Book

⬜ Relation Book

⬜ Architecture Book

⬜ Source Validator

⬜ Risk Analyzer

⬜ Knowledge Report

---

## Folder Structure

contracts/

Defines responsibilities and engineering rules.

templates/

Defines output layout.

generators/

Converts data into books.

generated/

Temporary generated artifacts.

cache/

Temporary runtime cache.

---

## Engineering Principles

One Generator = One Responsibility

No Hardcoded Documentation

Generated Files Are Never Edited

Contracts Before Implementation

Templates Own Presentation

Generators Own Logic

---

# OKE Engineering Laws

LAW 001

Every engineering subsystem must have a contract.

LAW 002

Documentation is part of the system.

LAW 003

Generated documentation is never edited manually.

LAW 004

One generator has one responsibility.

LAW 005

Templates own presentation.

Generators own logic.

LAW 006

Every major refactor requires a Knowledge Build.

LAW 007

If OKE cannot understand a feature, the feature is not considered fully complete.

LAW 008

Source Book, Database Book, and Relation Book must always agree.

LAW 009

No guessing.

Always verify against the Source Book and Database Book.

LAW 010

OKE exists to preserve engineering knowledge across time.
```

---

## OKE\results\__init__.py

```
```

---

## OKE\results\specialist_result.py

```
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SpecialistResult:
    specialist: str
    status: str

    metrics: dict[str, Any] = field(default_factory=dict)

    duration_ms: float = 0.0
```

---

## OKE\rules\__init__.py

```
```

---

## OKE\rules\engineering_metrics.py

```
from OKE.models.engineering_metrics import EngineeringMetrics


class EngineeringMetricsCalculator:

    def calculate(
        self,
        columns,
        primary_keys,
        foreign_keys,
        referenced_by,
        dependencies,
    ):
        return EngineeringMetrics(
            relationship_count=len(referenced_by),
            dependency_count=len(dependencies),
            column_count=len(columns),
            primary_key_count=len(primary_keys),
            foreign_key_count=len(foreign_keys),
        )
```

---

## OKE\rules\engineering_rules.py

```
class EngineeringRules:

    def calculate_risk(self, dependency_count):

        if dependency_count >= 10:
            return "CRITICAL"

        if dependency_count >= 5:
            return "HIGH"

        if dependency_count >= 2:
            return "MEDIUM"

        return "LOW"
```

---

## OKE\services\engineering_report_service.py

```
from OKE.builders.dependency_builder import DependencyBuilder
from OKE.builders.relationship_builder import RelationshipBuilder
from OKE.models.engineering_metrics import EngineeringMetrics
from OKE.models.engineering_report import EngineeringReport
from OKE.rules.engineering_rules import EngineeringRules


class EngineeringReportService:

    def build(
        self,
        tables,
        columns,
        primary_keys,
        foreign_keys,
        table_name,
    ):

        relationships = RelationshipBuilder().build(foreign_keys)
        dependency_graph = DependencyBuilder().build(relationships)

        table_columns = [
            c for c in columns
            if c["table_name"] == table_name
        ]

        table_primary_keys = [
            pk for pk in primary_keys
            if pk["table_name"] == table_name
        ]

        table_foreign_keys = [
            fk for fk in foreign_keys
            if fk["table_name"] == table_name
        ]

        referenced_by = relationships.get(table_name, [])
        dependencies = dependency_graph.get(table_name, [])

        metrics = EngineeringMetrics(
            column_count=len(table_columns),
            primary_key_count=len(table_primary_keys),
            foreign_key_count=len(table_foreign_keys),
            referenced_by_count=len(referenced_by),
            dependency_count=len(dependencies),
        )

        rules = EngineeringRules()
        risk = rules.calculate_risk(metrics.dependency_count)

        return EngineeringReport(
            subject=table_name,
            risk=risk,
            metrics=metrics,
            columns=table_columns,
            primary_keys=table_primary_keys,
            foreign_keys=table_foreign_keys,
            referenced_by=referenced_by,
            dependencies=dependencies,
        )
```

---

## OKE\specialists\__init__.py

```
```

---

## OKE\specialists\api\__init__.py

```
```

---

## OKE\specialists\api\specialist.py

```
```

---

## OKE\specialists\base.py

```
from abc import ABC, abstractmethod


class BaseSpecialist(ABC):

    name = "base"

    _registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        if getattr(cls, "name", None) and cls.name != "base":
            BaseSpecialist._registry[cls.name] = cls

    @classmethod
    def registry(cls):
        return dict(cls._registry)

    @abstractmethod
    def analyze(self, **kwargs):
        raise NotImplementedError
```

---

## OKE\specialists\billing\__init__.py

```
```

---

## OKE\specialists\billing\analyzer.py

```
```

---

## OKE\specialists\billing\builder.py

```
```

---

## OKE\specialists\billing\knowledge.py

```
```

---

## OKE\specialists\billing\model.py

```
```

---

## OKE\specialists\billing\pipeline.py

```
```

---

## OKE\specialists\billing\README.md

```
```

---

## OKE\specialists\billing\rule.py

```
```

---

## OKE\specialists\billing\service.py

```
```

---

## OKE\specialists\billing\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\specialists\database\__init__.py

```
```

---

## OKE\specialists\database\analyzers\__init__.py

```
```

---

## OKE\specialists\database\builders\__init__.py

```
```

---

## OKE\specialists\database\knowledge\__init__.py

```
```

---

## OKE\specialists\database\models\__init__.py

```
```

---

## OKE\specialists\database\pipelines\__init__.py

```
```

---

## OKE\specialists\database\rules\__init__.py

```
```

---

## OKE\specialists\database\services\__init__.py

```
```

---

## OKE\specialists\database\specialist.py

```
from OKE.pipelines.engineering_pipeline import EngineeringPipeline
from OKE.specialists.base import BaseSpecialist


class DatabaseSpecialist(BaseSpecialist):

    name = "database"
    display_name = "Database Specialist"
    version = "1.0"

    def analyze(
        self,
        tables=None,
        columns=None,
        primary_keys=None,
        foreign_keys=None,
        table_name=None,
        context=None,
    ):

        if context and context.database:
            database = context.database

            tables = database.tables
            columns = database.columns
            primary_keys = database.primary_keys
            foreign_keys = database.foreign_keys
            table_name = database.table_name

        return EngineeringPipeline().run(
            tables=tables,
            columns=columns,
            primary_keys=primary_keys,
            foreign_keys=foreign_keys,
            table_name=table_name,
        )

    def describe(self):

        return {
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "responsibility": [
                "Database Discovery",
                "Relationship Analysis",
                "Dependency Analysis",
                "Impact Analysis",
                "Regression Planning",
                "Engineering Recommendation",
            ],
        }
```

---

## OKE\specialists\deployment\__init__.py

```
```

---

## OKE\specialists\deployment\specialist.py

```
```

---

## OKE\specialists\docs\__init__.py

```
```

---

## OKE\specialists\docs\specialist.py

```
```

---

## OKE\specialists\inventory\__init__.py

```
```

---

## OKE\specialists\inventory\analyzer.py

```
```

---

## OKE\specialists\inventory\builder.py

```
```

---

## OKE\specialists\inventory\knowledge.py

```
```

---

## OKE\specialists\inventory\model.py

```
```

---

## OKE\specialists\inventory\pipeline.py

```
```

---

## OKE\specialists\inventory\README.md

```
```

---

## OKE\specialists\inventory\rule.py

```
```

---

## OKE\specialists\inventory\service.py

```
```

---

## OKE\specialists\inventory\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\specialists\payments\__init__.py

```
```

---

## OKE\specialists\payments\analyzer.py

```
```

---

## OKE\specialists\payments\builder.py

```
```

---

## OKE\specialists\payments\knowledge.py

```
```

---

## OKE\specialists\payments\model.py

```
```

---

## OKE\specialists\payments\pipeline.py

```
```

---

## OKE\specialists\payments\README.md

```
```

---

## OKE\specialists\payments\rule.py

```
```

---

## OKE\specialists\payments\service.py

```
```

---

## OKE\specialists\payments\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\specialists\reports\__init__.py

```
```

---

## OKE\specialists\reports\analyzer.py

```
```

---

## OKE\specialists\reports\builder.py

```
```

---

## OKE\specialists\reports\knowledge.py

```
```

---

## OKE\specialists\reports\model.py

```
```

---

## OKE\specialists\reports\pipeline.py

```
```

---

## OKE\specialists\reports\README.md

```
```

---

## OKE\specialists\reports\rule.py

```
```

---

## OKE\specialists\reports\service.py

```
```

---

## OKE\specialists\reports\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\specialists\reservation\__init__.py

```
```

---

## OKE\specialists\reservation\analyzer.py

```
```

---

## OKE\specialists\reservation\builder.py

```
```

---

## OKE\specialists\reservation\knowledge.py

```
```

---

## OKE\specialists\reservation\model.py

```
```

---

## OKE\specialists\reservation\pipeline.py

```
```

---

## OKE\specialists\reservation\README.md

```
```

---

## OKE\specialists\reservation\rule.py

```
```

---

## OKE\specialists\reservation\service.py

```
```

---

## OKE\specialists\reservation\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\specialists\security\__init__.py

```
```

---

## OKE\specialists\security\specialist.py

```
```

---

## OKE\specialists\source\__init__.py

```
```

---

## OKE\specialists\source\specialist.py

```
class SourceSpecialist:

    name = "Source Specialist"
    version = "1.0"

    def analyze(self, **kwargs):
        """
        Analyze source code.
        Placeholder implementation.
        """

        return {
            "status": "PASS",
            "specialist": self.name,
            "summary": "Source analysis not implemented yet.",
            "findings": [],
            "recommendations": [],
        }

    def describe(self):

        return {
            "name": self.name,
            "version": self.version,
            "responsibility": [
                "Code Structure",
                "Architecture Review",
                "Dependency Review",
                "Refactoring Suggestions",
                "Engineering Quality",
            ],
        }
```

---

## OKE\specialists\template\__init__.py

```
```

---

## OKE\specialists\template\specialist.py

```
from OKE.specialists.base import BaseSpecialist


class TemplateSpecialist(BaseSpecialist):

    name = "template"
    display_name = "Template Specialist"
    version = "1.0"

    def analyze(self, **kwargs):

        return {
            "status": "PASS",
            "specialist": self.name,
            "summary": "Replace this with specialist analysis.",
            "findings": [],
            "recommendations": [],
        }

    def describe(self):

        return {
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "responsibility": [
                "Replace with responsibility 1",
                "Replace with responsibility 2",
            ],
        }
```

---

## OKE\specialists\testing\__init__.py

```
```

---

## OKE\specialists\testing\specialist.py

```
```

---

## OKE\specialists\ui\__init__.py

```
```

---

## OKE\specialists\ui\specialist.py

```
```

---

## OKE\specs\database_schema_spec.md

```
```

---

## OKE\standards\__init__.py

```
```

---

## OKE\standards\analyzer_standard.py

```
```

---

## OKE\standards\pipeline_standard.py

```
```

---

## OKE\standards\report_standard.py

```
```

---

## OKE\standards\specialist_standard.py

```
```

---

## OKE\templates\database_book_template.md

```
# {{BOOK_TITLE}}

Generated:
{{GENERATED_AT}}

Version:
{{VERSION}}

---

# Summary

Tables

{{TOTAL_TABLES}}

Columns

{{TOTAL_COLUMNS}}

---

# Purpose

{{PURPOSE}}

---

# Table Index

{{TABLE_INDEX}}

---

{{TABLE_CONTENT}}

---

Generated by

OPSCORE Knowledge Engine (OKE)

Generator

{{GENERATOR}}

Contract

{{CONTRACT}}

Template

database_book_template.md
```

---

## OKE\templates\specialist\__init__.py

```
```

---

## OKE\templates\specialist\analyzer.py

```
```

---

## OKE\templates\specialist\builder.py

```
```

---

## OKE\templates\specialist\knowledge.py

```
```

---

## OKE\templates\specialist\model.py

```
```

---

## OKE\templates\specialist\pipeline.py

```
```

---

## OKE\templates\specialist\README.md

```
```

---

## OKE\templates\specialist\rule.py

```
```

---

## OKE\templates\specialist\service.py

```
```

---

## OKE\templates\specialist\specialist.py

```
from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination
```

---

## OKE\timeline\__init__.py

```
from .event import EngineeringEvent
from .timeline import EngineeringTimeline
```

---

## OKE\timeline\event.py

```
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class EngineeringEvent:

    timestamp: datetime

    event_type: str

    message: str

    data: Any = None
```

---

## OKE\timeline\timeline.py

```
from .event import EngineeringEvent


class EngineeringTimeline:

    def __init__(self):

        self.events = []

    def record(self, event: EngineeringEvent):

        self.events.append(event)

    def latest(self):

        if not self.events:
            return None

        return self.events[-1]

    def all(self):

        return list(self.events)
```

---

## OKE\VERSION.md

```
```

---

## OKE\workspace\__init__.py

```
from .workspace_manager import WorkspaceManager
from .snapshot_manager import SnapshotManager
from .comparator import SnapshotComparator
from .repository import WorkspaceRepository
```

---

## OKE\workspace\comparator.py

```
class SnapshotComparator:

    def compare(
        self,
        previous,
        current,
    ):

        previous = previous or {}
        current = current or {}

        previous_columns = set(
            previous.get("snapshot", {}).get("columns", [])
        )

        current_columns = set(
            current.get("snapshot", {}).get("columns", [])
        )

        return {
            "added_columns": sorted(
                current_columns - previous_columns
            ),
            "removed_columns": sorted(
                previous_columns - current_columns
            ),
            "changed": previous_columns != current_columns,
        }
```

---

## OKE\workspace\reports\employees.json

```
{
  "name": "employees",
  "generated_at": "2026-06-27T23:19:45.483212",
  "data": {
    "task": "analyze employees table",
    "table": "employees",
    "risk": "HIGH",
    "metrics": {
      "columns": 42,
      "primary_keys": 1,
      "foreign_keys": 2,
      "referenced_by": 9,
      "dependencies": 9
    },
    "impact": {
      "affected_tables": [
        "attendance_entries",
        "biometric_mappings",
        "cash_advance_requests",
        "employee_balances",
        "leave_requests",
        "payroll_records",
        "pos_sessions",
        "pos_sessions",
        "system_users"
      ],
      "affected_table_count": 9,
      "affected_modules": [
        "Attendance",
        "Finance",
        "Leave",
        "POS",
        "Payroll",
        "Security",
        "Workforce"
      ],
      "affected_module_count": 7
    },
    "regression": {
      "checklist": [
        "Attendance Import",
        "Cash Drawer",
        "Cash In",
        "Cash Out",
        "Close Session",
        "Create Employee",
        "Deactivate Employee",
        "Edit Employee",
        "Generate Payroll",
        "Leave Approval",
        "Leave Balance",
        "Leave Request",
        "Open Session",
        "POS Login",
        "Payslip Generation",
        "Release Payroll",
        "Role Permission",
        "Time In",
        "Time Out",
        "User Login"
      ],
      "check_count": 20
    },
    "recommendation": "High impact change detected. Run the full regression checklist before deployment."
  }
}
```

---

## OKE\workspace\reports\manager_test.json

```
{
  "name": "manager_test",
  "generated_at": "2026-06-27T23:40:59.230840",
  "data": {
    "status": "PASS"
  }
}
```

---

## OKE\workspace\reports\repo_test.json

```
{
  "status": "PASS"
}
```

---

## OKE\workspace\reports\test.json

```
{
  "name": "test",
  "generated_at": "2026-06-27T23:13:48.474486",
  "data": {
    "status": "PASS"
  }
}
```

---

## OKE\workspace\repository.py

```
from pathlib import Path
import json


class WorkspaceRepository:

    def __init__(self):

        self.root = Path(__file__).resolve().parent

    def read_json(self, folder, name):

        path = self.root / folder / f"{name}.json"

        if not path.exists():
            return None

        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

    def write_json(
        self,
        folder,
        name,
        data,
    ):

        directory = self.root / folder

        directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        path = directory / f"{name}.json"

        path.write_text(
            json.dumps(
                data,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        return path

    def exists(
        self,
        folder,
        name,
    ):

        return (
            self.root / folder / f"{name}.json"
        ).exists()
```

---

## OKE\workspace\snapshot_manager.py

```
from pathlib import Path
import json
from datetime import datetime


class SnapshotManager:

    def __init__(self):

        self.root = Path(__file__).resolve().parent
        self.snapshots = self.root / "snapshots"

        self.snapshots.mkdir(
            parents=True,
            exist_ok=True,
        )

    def save_snapshot(
        self,
        name,
        data,
    ):

        path = self.snapshots / f"{name}.json"

        payload = {
            "name": name,
            "captured_at": datetime.now().isoformat(),
            "snapshot": data,
        }

        path.write_text(
            json.dumps(
                payload,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        return path

    def load_snapshot(
        self,
        name,
    ):

        path = self.snapshots / f"{name}.json"

        if not path.exists():
            return None

        return json.loads(
            path.read_text(
                encoding="utf-8",
            )
        )

    def exists(
        self,
        name,
    ):

        return (
            self.snapshots / f"{name}.json"
        ).exists()
```

---

## OKE\workspace\snapshots\employees.json

```
{
  "name": "employees",
  "captured_at": "2026-06-27T23:31:08.404352",
  "snapshot": {
    "columns": [
      "id",
      "name"
    ]
  }
}
```

---

## OKE\workspace\workspace_manager.py

```
from datetime import datetime

from OKE.workspace.repository import WorkspaceRepository


class WorkspaceManager:

    def __init__(self):

        self.repository = WorkspaceRepository()

    def save_report(self, name, data):

        payload = {
            "name": name,
            "generated_at": datetime.now().isoformat(),
            "data": data,
        }

        return self.repository.write_json(
            "reports",
            name,
            payload,
        )

    def load_report(self, name):

        return self.repository.read_json(
            "reports",
            name,
        )
```
