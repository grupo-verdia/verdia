import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const DEFAULT_EXCLUDE_GLOBS = [
  /(^|\/)__tests__\//,
  /\.test\.[^/]+$/,
  /(^|\/)tests\//,
];

/**
 * @param {string} path
 * @param {RegExp[]} [excludePatterns]
 */
export function isExcludedPath(path, excludePatterns = DEFAULT_EXCLUDE_GLOBS) {
  const normalized = path.replaceAll("\\", "/");
  return excludePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * @param {{ path: string, lineCount: number }[]} files
 * @param {{ maxFileLines: number, excludePatterns?: RegExp[] }} options
 * @returns {{ path: string, lineCount: number, maxFileLines: number }[]}
 */
export function collectFileSizeViolations(files, options) {
  const excludePatterns = options.excludePatterns ?? DEFAULT_EXCLUDE_GLOBS;
  const violations = [];
  for (const file of files) {
    if (isExcludedPath(file.path, excludePatterns)) continue;
    if (file.lineCount > options.maxFileLines) {
      violations.push({
        path: file.path,
        lineCount: file.lineCount,
        maxFileLines: options.maxFileLines,
      });
    }
  }
  return violations;
}

/**
 * @param {string} rootDir
 * @param {string[]} extensions e.g. [".ts", ".tsx", ".py"]
 * @returns {string[]}
 */
export function listSourceFiles(rootDir, extensions) {
  /** @type {string[]} */
  const out = [];
  const skipDirNames = new Set([
    "node_modules",
    ".next",
    ".venv",
    "venv",
    "dist",
    "build",
    ".git",
  ]);

  /**
   * @param {string} dir
   */
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (skipDirNames.has(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (extensions.some((ext) => entry.endsWith(ext))) {
        out.push(full);
      }
    }
  }

  walk(rootDir);
  return out;
}

/**
 * @param {string} filePath
 */
export function countLines(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  // Trailing newline yields an empty final segment — don't count it as a line.
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

/**
 * @param {{
 *   rootDir: string,
 *   repoRoot: string,
 *   extensions: string[],
 *   maxFileLines: number,
 * }} options
 */
export function checkTree(options) {
  const files = listSourceFiles(options.rootDir, options.extensions).map(
    (absolutePath) => ({
      path: relative(options.repoRoot, absolutePath).replaceAll("\\", "/"),
      lineCount: countLines(absolutePath),
    }),
  );
  return collectFileSizeViolations(files, {
    maxFileLines: options.maxFileLines,
  });
}

function printHelp() {
  console.log(`Usage: node scripts/ci/check-file-size.mjs --root <dir> --max <n> --ext <exts>

  --root   Directory to scan (required)
  --max    Max lines per production file (required)
  --ext    Comma-separated extensions, e.g. .ts,.tsx or .py (required)
`);
}

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const args = parseArgs(argv);
  if (!args.root || !args.max || !args.ext) {
    printHelp();
    return 2;
  }
  const maxFileLines = Number(args.max);
  if (!Number.isFinite(maxFileLines) || maxFileLines <= 0) {
    console.error(`Invalid --max: ${args.max}`);
    return 2;
  }
  const extensions = args.ext.split(",").map((e) => e.trim()).filter(Boolean);
  const rootDir = join(REPO_ROOT, args.root);
  const violations = checkTree({
    rootDir,
    repoRoot: REPO_ROOT,
    extensions,
    maxFileLines,
  });
  if (violations.length === 0) {
    console.log(
      `OK: no production files under ${args.root} exceed ${maxFileLines} lines.`,
    );
    return 0;
  }
  console.error(`File size limit exceeded (max ${maxFileLines} lines):`);
  for (const v of violations) {
    console.error(`  ${v.path}: ${v.lineCount} lines`);
  }
  return 1;
}

const isCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  process.exitCode = main(process.argv.slice(2));
}
