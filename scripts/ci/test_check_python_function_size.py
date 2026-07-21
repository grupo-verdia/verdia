from pathlib import Path

from check_python_function_size import (
    collect_function_size_violations,
    is_excluded_path,
)


def test_is_excluded_path_for_tests(tmp_path: Path) -> None:
    root = tmp_path
    assert is_excluded_path(root / "tests" / "test_x.py", root) is True
    assert is_excluded_path(root / "src" / "app.py", root) is False


def test_reports_oversized_function() -> None:
    source = "def big():\n" + ("    x = 1\n" * 60)
    violations = collect_function_size_violations(
        source,
        path="mod.py",
        max_function_lines=60,
    )
    # def line + 60 body lines = 61
    assert len(violations) == 1
    assert violations[0].name == "big"
    assert violations[0].line_count == 61


def test_allows_function_at_limit() -> None:
    # 1 def + 59 body = 60
    source = "def ok():\n" + ("    x = 1\n" * 59)
    violations = collect_function_size_violations(
        source,
        path="mod.py",
        max_function_lines=60,
    )
    assert violations == []
