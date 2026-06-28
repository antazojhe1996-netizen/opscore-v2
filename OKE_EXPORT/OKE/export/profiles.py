class ExportProfiles:

    REVIEW = "review"
    SNAPSHOT = "snapshot"
    HANDBOOK = "handbook"
    FULL = "full"
    AI = "ai"

    PROFILES = {

        REVIEW: {
            "name": "OPSCORE Review Package",
            "description": "Engineering review package for AI and engineer onboarding.",
            "output_zip": "OPSCORE_REVIEW_PACKAGE.zip",
            "artifacts": [
                "ENGINEERING_INDEX.md",
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",
                "reports",
            ],
        },

        SNAPSHOT: {
            "name": "OPSCORE Engineering Snapshot",
            "description": "Full engineering snapshot including source and review materials.",
            "output_zip": "OPSCORE_ENGINEERING_SNAPSHOT.zip",
            "artifacts": [
                "ENGINEERING_INDEX.md",
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",
                "OKE_TREE.txt",
                "EXPORT_TREE.txt",
                "reports",
                "OKE",
            ],
        },

        HANDBOOK: {
            "name": "OKE Knowledge Handbook",
            "description": "Core direction and onboarding documents.",
            "output_zip": "OKE_KNOWLEDGE_HANDBOOK.zip",
            "artifacts": [
                "ENGINEERING_INDEX.md",
                "START_HERE.md",
                "COMPASS.md",
                "CURRENT_MISSION.md",
                "PROJECT_HISTORY.md",
                "AI_CONTEXT.md",
                "README.md",
                "03_OKE_COMMAND_REFERENCE.md",
                "04_ENGINEERING_WORKFLOW.md",
                "05_RECOVERY_GUIDE.md",
                "09_CHAT_BOOTSTRAP_PROMPT.md",
            ],
        },

        AI: {
            "name": "OPSCORE AI Continuity Package",
            "description": "Small package for continuing OPSCORE/OKE work in a new AI chat.",
            "output_zip": "OPSCORE_AI_CONTINUITY_PACKAGE.zip",
            "artifacts": [
                "ENGINEERING_INDEX.md",
                "README.md",
                "manifest.json",
                "START_HERE.md",
                "AI_CONTEXT.md",
                "COMPASS.md",
                "CURRENT_MISSION.md",
                "PROJECT_SUMMARY.md",
                "PROJECT_HISTORY.md",
                "ENGINEERING_STATUS.md",
                "03_OKE_COMMAND_REFERENCE.md",
                "04_ENGINEERING_WORKFLOW.md",
                "05_RECOVERY_GUIDE.md",
                "06_ARCHITECTURE.md",
                "08_NEXT_ROADMAP.md",
                "09_CHAT_BOOTSTRAP_PROMPT.md",
                "10_OKE_AUDIT_SUMMARY.md",
                "11_OKE_ARCHITECTURE_BOOK.md",
                "12_OKE_COMMAND_PLAYBOOK.md",
                "13_OKE_TRANSITION_GUIDE.md",
                "reports",
            ],
        },

        FULL: {
            "name": "OPSCORE Complete Engineering Package",
            "description": "Complete engineering package including source, database, knowledge, documentation, audit reports, and OKE source.",
            "output_zip": "OPSCORE_FULL_ENGINEERING_PACKAGE.zip",
            "artifacts": [
                "ENGINEERING_INDEX.md",
                "README.md",
                "manifest.json",

                # Project memory
                "PROJECT_SUMMARY.md",
                "PROJECT_HISTORY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "START_HERE.md",
                "COMPASS.md",
                "CURRENT_MISSION.md",

                # Engineering continuity docs
                "00_START_HERE.md",
                "01_ENGINEERING_CONSTITUTION.md",
                "02_CURRENT_PROJECT_STATE.md",
                "03_OKE_COMMAND_REFERENCE.md",
                "04_ENGINEERING_WORKFLOW.md",
                "05_RECOVERY_GUIDE.md",
                "06_ARCHITECTURE.md",
                "07_KNOWLEDGE_BASE.md",
                "08_NEXT_ROADMAP.md",
                "09_CHAT_BOOTSTRAP_PROMPT.md",
                "10_OKE_AUDIT_SUMMARY.md",
                "11_OKE_ARCHITECTURE_BOOK.md",
                "12_OKE_COMMAND_PLAYBOOK.md",
                "13_OKE_TRANSITION_GUIDE.md",

                # Source/database books
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",

                # Generated trees
                "OKE_TREE.txt",
                "EXPORT_TREE.txt",

                # Reports and source
                "reports",
                "OKE",
            ],
        },

    }

    @classmethod
    def get(cls, profile):
        profile = profile.lower().replace("--", "")

        if profile not in cls.PROFILES:
            raise ValueError(f"Unknown export profile: {profile}")

        return cls.PROFILES[profile]

    @classmethod
    def all(cls):
        return cls.PROFILES

    @classmethod
    def names(cls):
        return list(cls.PROFILES.keys())