#!/usr/bin/env python3
"""
Yeti - A task runner with plan mode.

Run tasks and see what would change before committing to it.
Usage:
  yeti apply [--plan] <taskfile>
  yeti --help
"""

import argparse
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

Action = Literal["create", "update", "delete", "mkdir"]


@dataclass
class Change:
    action: Action
    path: str
    content: str | None = None
    old_content: str | None = None


def load_taskfile(path: str) -> list[dict]:
    with open(path) as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Task file must be a JSON array of tasks")
    return data


def plan_changes(tasks: list[dict], base_dir: Path) -> list[Change]:
    """Compute the list of changes that would be made."""
    changes: list[Change] = []
    for task in tasks:
        action: Action = task["action"]
        path = str(base_dir / task["path"])
        content = task.get("content")

        if action == "mkdir":
            if not Path(path).exists():
                changes.append(Change(action="mkdir", path=path))
        elif action == "create":
            if Path(path).exists():
                old = Path(path).read_text()
                if old != content:
                    changes.append(Change(action="update", path=path, content=content, old_content=old))
            else:
                changes.append(Change(action="create", path=path, content=content))
        elif action == "delete":
            if Path(path).exists():
                old = Path(path).read_text() if Path(path).is_file() else None
                changes.append(Change(action="delete", path=path, old_content=old))
        else:
            raise ValueError(f"Unknown action: {action!r}")

    return changes


# ANSI colour codes
_RED = "\033[31m"
_GREEN = "\033[32m"
_YELLOW = "\033[33m"
_CYAN = "\033[36m"
_BOLD = "\033[1m"
_RESET = "\033[0m"


def _colour(text: str, code: str, use_colour: bool) -> str:
    return f"{code}{text}{_RESET}" if use_colour else text


def print_plan(changes: list[Change], use_colour: bool = True) -> None:
    """Pretty-print the planned changes."""
    if not changes:
        print("No changes to apply.")
        return

    action_symbol = {
        "create": ("+ create", _GREEN),
        "update": ("~ update", _YELLOW),
        "delete": ("- delete", _RED),
        "mkdir":  ("+ mkdir ", _CYAN),
    }

    print()
    print(_colour("Planned changes:", _BOLD, use_colour))
    print()

    for ch in changes:
        sym, colour = action_symbol[ch.action]
        label = _colour(sym, colour, use_colour)
        print(f"  {label}  {ch.path}")

        if ch.action == "update" and ch.old_content is not None and ch.content is not None:
            _print_inline_diff(ch.old_content, ch.content, use_colour)

    print()
    summary_parts = []
    counts = {a: sum(1 for c in changes if c.action == a) for a in ("create", "update", "delete", "mkdir")}
    if counts["create"] or counts["mkdir"]:
        n = counts["create"] + counts["mkdir"]
        summary_parts.append(_colour(f"{n} to add", _GREEN, use_colour))
    if counts["update"]:
        summary_parts.append(_colour(f"{counts['update']} to change", _YELLOW, use_colour))
    if counts["delete"]:
        summary_parts.append(_colour(f"{counts['delete']} to delete", _RED, use_colour))

    print(_colour("Plan:", _BOLD, use_colour) + " " + ", ".join(summary_parts))
    print()
    print(_colour("Run without --plan to apply these changes.", _CYAN, use_colour))
    print()


def _print_inline_diff(old: str, new: str, use_colour: bool) -> None:
    old_lines = old.splitlines()
    new_lines = new.splitlines()
    removed = set(old_lines) - set(new_lines)
    added = set(new_lines) - set(old_lines)
    for line in old_lines:
        if line in removed:
            print("    " + _colour(f"- {line}", _RED, use_colour))
    for line in new_lines:
        if line in added:
            print("    " + _colour(f"+ {line}", _GREEN, use_colour))


def apply_changes(changes: list[Change]) -> None:
    """Apply the planned changes to disk."""
    for ch in changes:
        p = Path(ch.path)
        if ch.action == "mkdir":
            p.mkdir(parents=True, exist_ok=True)
            print(f"  Created directory: {ch.path}")
        elif ch.action == "create":
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(ch.content or "")
            print(f"  Created: {ch.path}")
        elif ch.action == "update":
            p.write_text(ch.content or "")
            print(f"  Updated: {ch.path}")
        elif ch.action == "delete":
            if p.is_dir():
                shutil.rmtree(p)
            else:
                p.unlink()
            print(f"  Deleted: {ch.path}")
    print(f"\nApplied {len(changes)} change(s).")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="yeti",
        description="Task runner with plan mode — see what would change before it happens.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    apply_p = sub.add_parser("apply", help="Apply (or plan) a task file")
    apply_p.add_argument("taskfile", help="Path to the JSON task file")
    apply_p.add_argument(
        "--plan",
        action="store_true",
        help="Show what would change without making any modifications",
    )
    apply_p.add_argument(
        "--no-colour",
        dest="no_colour",
        action="store_true",
        help="Disable coloured output",
    )

    args = parser.parse_args(argv)
    use_colour = not args.no_colour and sys.stdout.isatty()

    try:
        tasks = load_taskfile(args.taskfile)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        print(f"Error loading task file: {exc}", file=sys.stderr)
        return 1

    base_dir = Path(args.taskfile).parent
    changes = plan_changes(tasks, base_dir)

    if args.plan:
        print_plan(changes, use_colour=use_colour)
    else:
        if not changes:
            print("Nothing to do.")
        else:
            apply_changes(changes)

    return 0


if __name__ == "__main__":
    sys.exit(main())
