# Project Management — Alternative Approaches Considered

This document records the alternatives we evaluated before choosing GitHub Issues + Markdown Roadmap.

## Option A: Pure Markdown (plans/ directory only)

**Pros**: Simple, version-controlled, no external tool
**Cons**: No assignment, no status tracking, no notifications, poor for >2 people

**Verdict**: Good as the strategic layer, not sufficient alone.

## Option B: GitHub Issues Only (no Markdown roadmap)

**Pros**: Everything in one place
**Cons**: Hard to see the big picture, phase dependencies get lost in a flat list

**Verdict**: Missing the forest for the trees.

## Option C: Linear

**Pros**: Better UI, cycles, triage, agent-friendly API
**Cons**: Extra tool, costs money, another login, agent needs Linear API key

**Verdict**: Overkill for a university project team. Consider if the team grows beyond ~5.

## Option D: GitHub Issues + `plans/roadmap.md` (Recommended)

**Pros**: Strategic overview in repo, tactical tracking in Issues, agents can use `gh` CLI, zero extra cost
**Cons**: Requires discipline to keep roadmap and issues in sync

**Verdict**: Best balance for this team size and workflow.

## Why `plans/` and not other locations?

| Location | Verdict |
|----------|---------|
| `plans/` (repo root) | **Recommended.** Visible, version-controlled, separate from specs. |
| `specs/plans/` | Confusing — specs define *what*, plans define *when/how*. |
| `docs/` or `apps/docs/` | That's the Starlight docs site for users, not internal planning. |
| `.github/` | Convention is for templates/workflows, not project plans. |
| Wiki | Not version-controlled with the code, agents can't easily read it. |
| External tool (Notion, Confluence) | Agents can't access it. Breaks "everything in the repo" principle. |
