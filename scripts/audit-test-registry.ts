#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const TEST_CASES_DIR = join(ROOT, "test-cases");
const ALLOWED_TYPES = new Set([
  "Automated",
  "Automated + Manual",
  "Manual",
  "Semi-automated",
]);
const AUTOMATED_TYPES = new Set([
  "Automated",
  "Automated + Manual",
  "Semi-automated",
]);
const TEST_FILE_PATTERNS = [
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /\.spec\.ts$/,
  /\.spec\.tsx$/,
];
const WALK_SKIP_DIRS = new Set([
  ".git",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);
const COVERAGE_AUDIT_EXCEPTIONS = new Set([
  "apps/backend/src/test/ai-tagging.test.ts",
  "apps/backend/src/test/factories/index.test.ts",
  "apps/backend/src/test/index.scheduled.test.ts",
  "apps/web/src/components/ui/button.test.tsx",
  "apps/web/src/test/factories/index.test.ts",
]);

type TestCaseRecord = {
  id: string;
  type: string;
  automatedIn: string;
  automatedPaths: string[];
  regression: string;
  phase: string;
  sourceFile: string;
};

function walk(dir: string, predicate: (path: string) => boolean): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (WALK_SKIP_DIRS.has(entry)) {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectTestFiles(): string[] {
  return walk(
    ROOT,
    (candidate) =>
      TEST_FILE_PATTERNS.some((pattern) => pattern.test(candidate)) &&
      !candidate.startsWith(TEST_CASES_DIR),
  );
}

function shouldAuditTestFile(relPath: string) {
  return !COVERAGE_AUDIT_EXCEPTIONS.has(relPath);
}

function collectRegistryFiles(): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(TEST_CASES_DIR)) {
    if (entry === "index.md" || entry === "regression") {
      continue;
    }

    const fullPath = join(TEST_CASES_DIR, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(
        ...walk(fullPath, (candidate) => candidate.endsWith(".md")),
      );
      continue;
    }

    if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function parseAutomatedPaths(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") {
    return [];
  }

  const backtickPaths = [...trimmed.matchAll(/`([^`]+)`/g)].map((match) =>
    match[1].trim(),
  );
  if (backtickPaths.length > 0) {
    return [...new Set(backtickPaths)];
  }

  return [
    ...new Set(
      trimmed
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean),
    ),
  ];
}

function parseSectionStyle(content: string, sourceFile: string): TestCaseRecord[] {
  const blocks = content.split(/(?=^## TC-)/m).filter((block) => /^## TC-/m.test(block));
  const records: TestCaseRecord[] = [];

  for (const block of blocks) {
    const id = block.match(/^## (TC-[A-Z0-9-]+):/m)?.[1];
    if (!id) {
      continue;
    }

    const type = block.match(/\*\*Type\*\*:\s*(.+)/)?.[1]?.trim() ?? "";
    const automatedIn =
      block.match(/\*\*Automated in\*\*:\s*(.+)/)?.[1]?.trim() ?? "";
    const regression =
      block.match(/\*\*Regression\*\*:\s*(.+)/)?.[1]?.trim() ?? "";
    const phase =
      block.match(/\*\*Phase introduced\*\*:\s*(.+)/)?.[1]?.trim() ?? "";

    records.push({
      id,
      type,
      automatedIn,
      automatedPaths: parseAutomatedPaths(automatedIn),
      regression,
      phase,
      sourceFile,
    });
  }

  return records;
}

function parseTableStyle(content: string, sourceFile: string): TestCaseRecord[] {
  const records: TestCaseRecord[] = [];

  for (const line of content.split("\n")) {
    if (!line.startsWith("| TC-")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 7) {
      continue;
    }

    const [id, , , type, automatedIn, phase, regression] = cells;

    records.push({
      id,
      type,
      automatedIn,
      automatedPaths: parseAutomatedPaths(automatedIn),
      regression,
      phase,
      sourceFile,
    });
  }

  return records;
}

function parseRegistryFiles(): TestCaseRecord[] {
  const records: TestCaseRecord[] = [];

  for (const file of collectRegistryFiles()) {
    const content = readFileSync(file, "utf8");
    const sourceFile = relative(ROOT, file);

    if (content.includes("| ID | Spec Scenario |")) {
      records.push(...parseTableStyle(content, sourceFile));
    } else {
      records.push(...parseSectionStyle(content, sourceFile));
    }
  }

  return records;
}

function collectTestFileHits(files: string[]): Map<string, Set<string>> {
  const hits = new Map<string, Set<string>>();

  for (const file of files) {
    const relPath = relative(ROOT, file);
    const content = readFileSync(file, "utf8");

    for (const match of content.matchAll(/TC-[A-Z0-9-]+-\d+/g)) {
      const id = match[0];
      if (!hits.has(id)) {
        hits.set(id, new Set());
      }
      hits.get(id)?.add(relPath);
    }
  }

  return hits;
}

function main() {
  const errors: string[] = [];
  const infos: string[] = [];
  const records = parseRegistryFiles();
  const testFiles = collectTestFiles();
  const testFileHits = collectTestFileHits(testFiles);
  const seenIds = new Map<string, string>();
  const manualAlways: string[] = [];
  const manualAlwaysWithExactHits: string[] = [];

  for (const record of records) {
    if (!ALLOWED_TYPES.has(record.type)) {
      errors.push(
        `${record.sourceFile}: ${record.id} uses unsupported Type "${record.type}"`,
      );
    }

    const previousFile = seenIds.get(record.id);
    if (previousFile) {
      errors.push(
        `${record.sourceFile}: duplicate TC-ID ${record.id} already defined in ${previousFile}`,
      );
    } else {
      seenIds.set(record.id, record.sourceFile);
    }

    if (AUTOMATED_TYPES.has(record.type) && record.automatedPaths.length === 0) {
      errors.push(
        `${record.sourceFile}: ${record.id} is ${record.type} but is missing Automated in`,
      );
    }

    for (const automatedPath of record.automatedPaths) {
      const fullPath = join(ROOT, automatedPath);
      if (!existsSync(fullPath)) {
        errors.push(
          `${record.sourceFile}: ${record.id} references missing file ${automatedPath}`,
        );
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      if (!content.includes(record.id)) {
        errors.push(
          `${record.sourceFile}: ${record.id} references ${automatedPath}, but that file does not contain the exact TC-ID`,
        );
      }
    }

    if (record.regression === "Always" && !AUTOMATED_TYPES.has(record.type)) {
      manualAlways.push(record.id);

      if (testFileHits.has(record.id)) {
        manualAlwaysWithExactHits.push(
          `${record.id} -> ${[...testFileHits.get(record.id)!].sort().join(", ")}`,
        );
      }
    }
  }

  const knownIds = new Set(records.map((record) => record.id));
  for (const [id, hitFiles] of testFileHits) {
    if (!knownIds.has(id)) {
      errors.push(
        `Test files reference unknown TC-ID ${id}: ${[...hitFiles].sort().join(", ")}`,
      );
    }
  }

  for (const file of testFiles) {
    const relPath = relative(ROOT, file);
    if (!shouldAuditTestFile(relPath)) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    if (!content.match(/TC-[A-Z0-9-]+-\d+/)) {
      errors.push(
        `${relPath}: test file does not reference any TC-ID from the registry`,
      );
    }
  }

  const automatedWithoutExactHits = records.filter(
    (record) =>
      AUTOMATED_TYPES.has(record.type) && !testFileHits.has(record.id),
  );

  for (const record of automatedWithoutExactHits) {
    errors.push(
      `${record.sourceFile}: ${record.id} is marked ${record.type} but no test file references the TC-ID`,
    );
  }

  const automatedCases = records.filter((record) => AUTOMATED_TYPES.has(record.type)).length;
  infos.push(`Registry cases: ${records.length}`);
  infos.push(`Automated or semi-automated cases: ${automatedCases}`);
  infos.push(`Manual-only cases: ${records.length - automatedCases}`);
  infos.push(`Test files audited: ${testFiles.length}`);

  if (manualAlwaysWithExactHits.length > 0) {
    infos.push("Manual-only Regression Always cases with exact automated hits:");
    for (const info of manualAlwaysWithExactHits.sort()) {
      infos.push(`  ${info}`);
    }
  }

  if (errors.length > 0) {
    console.error("Test registry audit failed.\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    console.error("");
    for (const info of infos) {
      console.error(info);
    }
    process.exit(1);
  }

  console.log("Test registry audit passed.\n");
  for (const info of infos) {
    console.log(info);
  }
}

main();
