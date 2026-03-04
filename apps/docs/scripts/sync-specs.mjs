/**
 * Copies spec markdown files into the Starlight content directory,
 * injecting YAML frontmatter with the title extracted from the first h1.
 *
 * Starlight requires a `title` field in frontmatter. Spec files use a bare
 * `# Heading` instead, so this script bridges the gap without modifying
 * the source specs.
 */

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const SPECS_DIR = join(import.meta.dirname, "../../../specs");
const PLANS_DIR = join(import.meta.dirname, "../../../plans");
const SPECS_OUT_DIR = join(import.meta.dirname, "../src/content/docs/specs");
const PLANS_OUT_DIR = join(import.meta.dirname, "../src/content/docs/plans");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function injectFrontmatter(content, title) {
  // Escape quotes in title for YAML safety
  const safeTitle = title.replace(/"/g, '\\"');
  const frontmatter = `---\ntitle: "${safeTitle}"\n---\n\n`;

  // Remove the first h1 line to prevent Starlight from rendering a duplicate
  const withoutH1 = content.replace(/^#\s+.+\n+/, "");
  return frontmatter + withoutH1;
}

async function syncDir(srcDir, outDir, label) {
  await rm(outDir, { recursive: true, force: true });

  const files = await walk(srcDir);

  for (const file of files) {
    const rel = relative(srcDir, file);
    const outPath = join(outDir, rel);

    await mkdir(dirname(outPath), { recursive: true });

    const content = await readFile(file, "utf-8");

    // Skip files that already have frontmatter
    if (content.trimStart().startsWith("---")) {
      await writeFile(outPath, content);
      continue;
    }

    const title = extractTitle(content);
    if (title) {
      await writeFile(outPath, injectFrontmatter(content, title));
    } else {
      // No h1 found — write with a fallback title
      const fallback = `---\ntitle: "${rel.replace(/\.md$/, "")}"\n---\n\n${content}`;
      await writeFile(outPath, fallback);
    }
  }

  console.log(`Synced ${files.length} ${label} files to ${outDir}`);
}

async function main() {
  await syncDir(SPECS_DIR, SPECS_OUT_DIR, "spec");
  await syncDir(PLANS_DIR, PLANS_OUT_DIR, "plan");
}

main();
