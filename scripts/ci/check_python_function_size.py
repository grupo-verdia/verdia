"""Fail when Python production functions exceed a max line count."""

from __future__ import annotations

import ast
import sys
from dataclasses import dataclass
from pathlib import Path


EXCLUDE_DIR_NAMES = {
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "tests",
}


@dataclass(frozen=True)
class FunctionSizeViolation:
    path: str
    name: str
    line_count: int
    max_function_lines: int
    lineno: int


def is_excluded_path(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    parts = rel.parts
    if "tests" in parts:
        return True
    if path.name.startswith("test_"):
        return True
    return False


def function_line_count(node: ast.AST) -> int:
    end = getattr(node, "end_lineno", None)
    start = getattr(node, "lineno", None)
    if end is None or start is None:
        return 0
    return end - start + 1


def collect_function_size_violations(
    source: str,
    *,
    path: str,
    max_function_lines: int,
) -> list[FunctionSizeViolation]:
    tree = ast.parse(source, filename=path)
    violations: list[FunctionSizeViolation] = []

    class Visitor(ast.NodeVisitor):
        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            self._check(node)
            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
            self._check(node)
            self.generic_visit(node)

        def _check(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
            count = function_line_count(node)
            if count > max_function_lines:
                violations.append(
                    FunctionSizeViolation(
                        path=path,
                        name=node.name,
                        line_count=count,
                        max_function_lines=max_function_lines,
                        lineno=node.lineno,
                    )
                )

    Visitor().visit(tree)
    return violations


def check_tree(root: Path, max_function_lines: int) -> list[FunctionSizeViolation]:
    violations: list[FunctionSizeViolation] = []
    for path in sorted(root.rglob("*.py")):
        if any(part in EXCLUDE_DIR_NAMES for part in path.parts):
            continue
        if is_excluded_path(path, root):
            continue
        source = path.read_text(encoding="utf-8")
        rel = str(path)
        violations.extend(
            collect_function_size_violations(
                source,
                path=rel,
                max_function_lines=max_function_lines,
            )
        )
    return violations


def main(argv: list[str]) -> int:
    if len(argv) != 4 or argv[0] != "--root" or argv[2] != "--max":
        print(
            "Usage: check_python_function_size.py --root <dir> --max <n>",
            file=sys.stderr,
        )
        return 2
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    root = (repo_root / argv[1]).resolve()
    max_function_lines = int(argv[3])
    violations = check_tree(root, max_function_lines)
    if not violations:
        print(
            f"OK: no production functions under {root} exceed {max_function_lines} lines."
        )
        return 0
    print(
        f"Function size limit exceeded (max {max_function_lines} lines):",
        file=sys.stderr,
    )
    for v in violations:
        print(f"  {v.path}:{v.lineno} {v.name} — {v.line_count} lines", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
