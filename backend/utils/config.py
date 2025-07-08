from pathlib import Path

class Config:
    lavel_dir = Path(".Lavel")
    subdirs = ["blocks", "knowledges", "thoughts", "todos", "reviews", "ops", "logs"]
    @staticmethod
    def init_dirs():
        for subdir in Config.subdirs:
            if not (Config.lavel_dir / subdir).exists():
                (Config.lavel_dir / subdir).mkdir()