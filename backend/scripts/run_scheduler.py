import sys
import os

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.scripts.run_scheduler import run_scheduler

if __name__ == "__main__":
    run_scheduler()
