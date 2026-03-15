"""Tests for yeti plan mode."""

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from yeti import apply_changes, load_taskfile, main, plan_changes


@pytest.fixture
def tmp(tmp_path):
    return tmp_path


def write_taskfile(tmp_path: Path, tasks: list) -> Path:
    p = tmp_path / "tasks.json"
    p.write_text(json.dumps(tasks))
    return p


# ---------------------------------------------------------------------------
# plan_changes
# ---------------------------------------------------------------------------

class TestPlanChanges:
    def test_create_new_file(self, tmp):
        tasks = [{"action": "create", "path": "hello.txt", "content": "hi"}]
        changes = plan_changes(tasks, tmp)
        assert len(changes) == 1
        assert changes[0].action == "create"
        assert changes[0].content == "hi"

    def test_no_change_when_content_identical(self, tmp):
        f = tmp / "hello.txt"
        f.write_text("hi")
        tasks = [{"action": "create", "path": "hello.txt", "content": "hi"}]
        changes = plan_changes(tasks, tmp)
        assert changes == []

    def test_update_when_content_differs(self, tmp):
        f = tmp / "hello.txt"
        f.write_text("old")
        tasks = [{"action": "create", "path": "hello.txt", "content": "new"}]
        changes = plan_changes(tasks, tmp)
        assert len(changes) == 1
        assert changes[0].action == "update"
        assert changes[0].old_content == "old"
        assert changes[0].content == "new"

    def test_delete_existing_file(self, tmp):
        f = tmp / "bye.txt"
        f.write_text("gone")
        tasks = [{"action": "delete", "path": "bye.txt"}]
        changes = plan_changes(tasks, tmp)
        assert len(changes) == 1
        assert changes[0].action == "delete"

    def test_delete_nonexistent_file_is_noop(self, tmp):
        tasks = [{"action": "delete", "path": "ghost.txt"}]
        changes = plan_changes(tasks, tmp)
        assert changes == []

    def test_mkdir_new_dir(self, tmp):
        tasks = [{"action": "mkdir", "path": "subdir"}]
        changes = plan_changes(tasks, tmp)
        assert len(changes) == 1
        assert changes[0].action == "mkdir"

    def test_mkdir_existing_dir_is_noop(self, tmp):
        (tmp / "subdir").mkdir()
        tasks = [{"action": "mkdir", "path": "subdir"}]
        changes = plan_changes(tasks, tmp)
        assert changes == []

    def test_unknown_action_raises(self, tmp):
        tasks = [{"action": "fly", "path": "x"}]
        with pytest.raises(ValueError, match="Unknown action"):
            plan_changes(tasks, tmp)


# ---------------------------------------------------------------------------
# apply_changes
# ---------------------------------------------------------------------------

class TestApplyChanges:
    def test_creates_file(self, tmp):
        from yeti import Change
        changes = [Change(action="create", path=str(tmp / "a.txt"), content="hello")]
        apply_changes(changes)
        assert (tmp / "a.txt").read_text() == "hello"

    def test_updates_file(self, tmp):
        from yeti import Change
        f = tmp / "b.txt"
        f.write_text("old")
        changes = [Change(action="update", path=str(f), content="new")]
        apply_changes(changes)
        assert f.read_text() == "new"

    def test_deletes_file(self, tmp):
        from yeti import Change
        f = tmp / "c.txt"
        f.write_text("bye")
        changes = [Change(action="delete", path=str(f))]
        apply_changes(changes)
        assert not f.exists()

    def test_mkdir(self, tmp):
        from yeti import Change
        d = tmp / "newdir"
        changes = [Change(action="mkdir", path=str(d))]
        apply_changes(changes)
        assert d.is_dir()


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------

class TestCLI:
    def test_plan_flag_prints_no_changes_when_already_applied(self, tmp, capsys):
        f = tmp / "tasks.json"
        target = tmp / "out.txt"
        target.write_text("hello")
        f.write_text(json.dumps([{"action": "create", "path": "out.txt", "content": "hello"}]))
        rc = main(["apply", "--plan", "--no-colour", str(f)])
        assert rc == 0
        out = capsys.readouterr().out
        assert "No changes" in out

    def test_plan_flag_shows_changes_without_applying(self, tmp, capsys):
        f = tmp / "tasks.json"
        f.write_text(json.dumps([{"action": "create", "path": "new.txt", "content": "x"}]))
        rc = main(["apply", "--plan", "--no-colour", str(f)])
        assert rc == 0
        assert not (tmp / "new.txt").exists()
        out = capsys.readouterr().out
        assert "create" in out

    def test_apply_creates_file(self, tmp, capsys):
        f = tmp / "tasks.json"
        target = tmp / "result.txt"
        f.write_text(json.dumps([{"action": "create", "path": "result.txt", "content": "done"}]))
        rc = main(["apply", "--no-colour", str(f)])
        assert rc == 0
        assert target.read_text() == "done"

    def test_bad_taskfile_returns_error(self, tmp, capsys):
        rc = main(["apply", str(tmp / "missing.json")])
        assert rc == 1

    def test_plan_summary_counts(self, tmp, capsys):
        f = tmp / "tasks.json"
        f.write_text(json.dumps([
            {"action": "create", "path": "a.txt", "content": "a"},
            {"action": "create", "path": "b.txt", "content": "b"},
        ]))
        main(["apply", "--plan", "--no-colour", str(f)])
        out = capsys.readouterr().out
        assert "2 to add" in out
