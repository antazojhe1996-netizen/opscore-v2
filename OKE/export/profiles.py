class ExportProfiles:

    REVIEW = "review"
    SNAPSHOT = "snapshot"
    HANDBOOK = "handbook"
    FULL = "full"

    PROFILES = {

        REVIEW: {
            "name": "OPSCORE Review Package",
            "description": "Engineering review package for AI and engineer onboarding.",
            "output_zip": "OPSCORE_REVIEW_PACKAGE.zip",
            "artifacts": [
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",
            ],
        },

        SNAPSHOT: {
            "name": "OPSCORE Engineering Snapshot",
            "description": "Full engineering snapshot including source and review materials.",
            "output_zip": "OPSCORE_ENGINEERING_SNAPSHOT.zip",
            "artifacts": [
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",
                "OKE",
            ],
        },

        HANDBOOK: {
            "name": "OKE Knowledge Handbook",
            "description": "Core direction and onboarding documents.",
            "output_zip": "OKE_KNOWLEDGE_HANDBOOK.zip",
            "artifacts": [
                "START_HERE.md",
                "COMPASS.md",
                "CURRENT_MISSION.md",
                "PROJECT_HISTORY.md",
                "AI_CONTEXT.md",
                "README.md",
            ],
        },

        FULL: {
            "name": "OPSCORE Complete Engineering Package",
            "description": "Complete engineering package including source, knowledge, documentation, and review artifacts.",
            "output_zip": "OPSCORE_FULL_ENGINEERING_PACKAGE.zip",
            "artifacts": [
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",

                # Knowledge
                "START_HERE.md",
                "COMPASS.md",
                "CURRENT_MISSION.md",
                "PROJECT_HISTORY.md",

                # Source
                "OKE",
            ],
        },

    }

    @classmethod
    def get(cls, profile):

        profile = profile.lower()

        if profile not in cls.PROFILES:
            raise ValueError(f"Unknown export profile: {profile}")

        return cls.PROFILES[profile]

    @classmethod
    def all(cls):

        return cls.PROFILES

    @classmethod
    def names(cls):

        return list(cls.PROFILES.keys())