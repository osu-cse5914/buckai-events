#!/usr/bin/env bun
/**
 * Generates a GitHub Issue body for manual regression testing.
 *
 * Usage: bun scripts/generate-regression-issue.ts <phase-number>
 *
 * Reads the regression suite file for the given phase, extracts all
 * manual test case IDs, resolves them from the test case registry,
 * and outputs a formatted markdown body with full steps and expected
 * behaviors for each case.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const TEST_CASES_DIR = join(ROOT, "test-cases");
const REGRESSION_DIR = join(TEST_CASES_DIR, "regression");

// --- Types ---

interface ManualTestCase {
  id: string;
  title: string;
  specScenario: string;
  phase: string;
  steps: string[];
  expected: string;
  given?: string;
  when?: string;
  then?: string;
}

// --- Parsing ---

function collectTestCaseFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (entry === "regression" || entry === "index.md") continue;
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectTestCaseFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseTestCase(block: string): ManualTestCase | null {
  const idMatch = block.match(/^## (TC-\S+):\s*(.+)/m);
  if (!idMatch) return null;

  const typeMatch = block.match(/\*\*Type\*\*:\s*(.+)/);
  if (!typeMatch || (!typeMatch[1].includes("Manual") && !typeMatch[1].includes("Semi-automated"))) return null;

  const id = idMatch[1];
  const title = idMatch[2].trim();
  const specMatch = block.match(/\*\*Spec scenario\*\*:\s*(.+)/);
  const phaseMatch = block.match(/\*\*Phase introduced\*\*:\s*(.+)/);

  // Parse steps (numbered list under **Steps**:)
  const steps: string[] = [];
  const stepsMatch = block.match(/\*\*Steps\*\*:\s*\n((?:\s+\d+\..+\n?)+)/);
  if (stepsMatch) {
    const stepLines = stepsMatch[1].trim().split("\n");
    for (const line of stepLines) {
      const cleaned = line.replace(/^\s*\d+\.\s*/, "").trim();
      if (cleaned) steps.push(cleaned);
    }
  }

  // Parse expected
  const expectedMatch = block.match(/\*\*Expected\*\*:\s*(.+)/);

  // Parse Given/When/Then for non-steps manual cases
  const givenMatch = block.match(/\*\*Given\*\*:\s*(.+)/);
  const whenMatch = block.match(/\*\*When\*\*:\s*(.+)/);
  const thenMatch = block.match(/\*\*Then\*\*:\s*(.+)/);

  return {
    id,
    title,
    specScenario: specMatch?.[1]?.trim() ?? "—",
    phase: phaseMatch?.[1]?.trim() ?? "—",
    steps,
    expected: expectedMatch?.[1]?.trim() ?? thenMatch?.[1]?.trim() ?? "",
    given: givenMatch?.[1]?.trim(),
    when: whenMatch?.[1]?.trim(),
    then: thenMatch?.[1]?.trim(),
  };
}

function parseAllManualCases(): Map<string, ManualTestCase> {
  const cases = new Map<string, ManualTestCase>();
  const files = collectTestCaseFiles(TEST_CASES_DIR);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    // Split on ## TC- headings
    const blocks = content.split(/(?=^## TC-)/m);
    for (const block of blocks) {
      const tc = parseTestCase(block);
      if (tc) {
        cases.set(tc.id, tc);
      }
    }
  }

  return cases;
}

function extractManualTcIds(regressionContent: string): string[] {
  const ids: string[] = [];
  const manualSection = regressionContent.split("## Manual checklist")[1];
  if (!manualSection) return ids;

  const matches = manualSection.matchAll(/\*\*(TC-\S+)\*\*/g);
  for (const match of matches) {
    ids.push(match[1]);
  }
  return ids;
}

function extractAdHocChecks(regressionContent: string): string[] {
  const checks: string[] = [];
  const manualSection = regressionContent.split("## Manual checklist")[1];
  if (!manualSection) return checks;

  const lines = manualSection.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Lines that start with - [ ] but don't have a TC-ID
    if (trimmed.startsWith("- [ ]") && !trimmed.includes("**TC-")) {
      checks.push(trimmed.replace("- [ ] ", ""));
    }
  }
  return checks;
}

// --- Output ---

function formatTestCase(tc: ManualTestCase): string {
  const lines: string[] = [];

  lines.push(`### ${tc.id}: ${tc.title}`);
  lines.push("");

  if (tc.specScenario !== "—") {
    lines.push(`> Spec scenario: ${tc.specScenario}`);
    lines.push("");
  }

  if (tc.steps.length > 0) {
    lines.push("**Steps:**");
    lines.push("");
    for (let i = 0; i < tc.steps.length; i++) {
      lines.push(`${i + 1}. ${tc.steps[i]}`);
    }
    lines.push("");
  } else if (tc.given || tc.when) {
    if (tc.given) lines.push(`**Given:** ${tc.given}`);
    if (tc.when) lines.push(`**When:** ${tc.when}`);
    lines.push("");
  }

  if (tc.expected) {
    lines.push(`**Expected:** ${tc.expected}`);
    lines.push("");
  }

  lines.push("**Result:** - [ ] Pass / - [ ] Fail");
  lines.push("");
  lines.push("**Notes:**");
  lines.push("<!-- Add screenshots or observations here -->");
  lines.push("");

  return lines.join("\n");
}

function generateIssueBody(
  phase: number,
  milestoneTitle: string,
  tcIds: string[],
  allCases: Map<string, ManualTestCase>,
  adHocChecks: string[]
): string {
  const lines: string[] = [];

  lines.push(`## Manual Regression — ${milestoneTitle}`);
  lines.push("");
  lines.push("Automated regression passed. Complete the manual test cases below.");
  lines.push("");
  lines.push("For each test case, follow the steps exactly, verify the expected result, and mark Pass or Fail.");
  lines.push("Add screenshots or notes for any failures.");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group cases by area
  const grouped = new Map<string, ManualTestCase[]>();
  const missing: string[] = [];

  for (const id of tcIds) {
    const tc = allCases.get(id);
    if (!tc) {
      missing.push(id);
      continue;
    }

    // Extract area from TC-ID prefix (TC-AUTH -> Auth, TC-EVT -> Events, etc.)
    const prefix = id.match(/TC-([A-Z-]+)-\d+/)?.[1] ?? "Other";
    const areaMap: Record<string, string> = {
      AUTH: "Authentication",
      AUTHZ: "Authorization",
      USER: "User Profile",
      PUB: "Public Profile",
      EVT: "Events",
      APP: "Gig Applications",
      ING: "External Ingestion",
      FOL: "Follows",
      SFEED: "Social Feed",
      COL: "Collections",
      INT: "Interactions",
      AI: "AI Model Router",
      EMBED: "Embeddings",
      "REC-MODEL": "Recommendations",
      FEED: "Recommendation Feed",
      CHAT: "Chatbot",
      CONV: "Conversations",
    };
    const area = areaMap[prefix] ?? prefix;

    if (!grouped.has(area)) grouped.set(area, []);
    grouped.get(area)!.push(tc);
  }

  // Render grouped cases
  for (const [area, cases] of grouped) {
    lines.push(`## ${area}`);
    lines.push("");
    for (const tc of cases) {
      lines.push(formatTestCase(tc));
    }
    lines.push("---");
    lines.push("");
  }

  // Ad-hoc checks (non-TC items from the regression file)
  if (adHocChecks.length > 0) {
    lines.push("## General Checks");
    lines.push("");
    for (const check of adHocChecks) {
      lines.push(`- [ ] ${check}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (missing.length > 0) {
    lines.push("## Missing Test Cases");
    lines.push("");
    lines.push("The following TC-IDs were referenced in the regression suite but not found in the registry:");
    lines.push("");
    for (const id of missing) {
      lines.push(`- ${id}`);
    }
    lines.push("");
  }

  // Summary
  const total = tcIds.length - missing.length + adHocChecks.length;
  lines.push("---");
  lines.push("");
  lines.push(`**Total manual checks:** ${total}`);
  lines.push("");
  lines.push("Generated automatically on milestone close.");

  return lines.join("\n");
}

// --- Main ---

const phase = parseInt(process.argv[2] ?? "");
if (isNaN(phase) || phase < 0 || phase > 6) {
  console.error("Usage: bun scripts/generate-regression-issue.ts <phase-number>");
  console.error("  phase-number: 0-6");
  process.exit(1);
}

const milestoneTitle = process.argv[3] ?? `Phase ${phase}`;

const regressionFile = join(REGRESSION_DIR, `phase-${phase}.md`);
let regressionContent: string;
try {
  regressionContent = readFileSync(regressionFile, "utf-8");
} catch {
  console.error(`Regression file not found: ${regressionFile}`);
  process.exit(1);
}

const tcIds = extractManualTcIds(regressionContent);
const adHocChecks = extractAdHocChecks(regressionContent);
const allCases = parseAllManualCases();

const body = generateIssueBody(phase, milestoneTitle, tcIds, allCases, adHocChecks);
console.log(body);
