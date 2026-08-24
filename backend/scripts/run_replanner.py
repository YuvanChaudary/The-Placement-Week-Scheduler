import sys
import os

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.scripts.run_replanner import run_replanner_live_defense

if __name__ == "__main__":
    run_replanner_live_defense()
