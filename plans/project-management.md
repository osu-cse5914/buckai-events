# Project Management for Collaborative + Agentic Development

## The Challenge

This project has a unique workflow:
- **Multiple human developers** collaborating on the same codebase
- **AI agents** (Claude Code) doing significant implementation work per the TDD workflow in AGENTS.md
- **Specs as source of truth** — the specs directory already defines all behavior

The project management approach needs to support both humans coordinating and agents executing.

---

## Recommended Approach: GitHub Issues + Markdown Roadmap

### Why This Combo

| Layer | Tool | Purpose |
|-------|------|---------|
| **Strategic** | `plans/roadmap.md` (this repo) | Phase breakdown, dependency graph, big picture |
| **Tactical** | GitHub Issues | Individual tasks, assignment, status tracking |
| **Operational** | Branch-per-task + PRs | Actual work, code review, CI checks |

### Why GitHub Issues (Not Linear, Jira, etc.)

1. **Already on GitHub** — no context switching, no extra tool
2. **Agent-friendly** — Claude Code can read/create/update issues via `gh` CLI
3. **Free for public repos** — GitHub Projects boards are included
4. **Labels + Milestones** — labels for scope/workflow, milestones for phases
5. **Issue types** — GitHub's native issue types (Feature, Task, Bug) replace type labels
6. **Issue templates** — standardize task creation for agents and humans

### Setup

#### Labels

```
# Scope labels
scope:api
scope:web
scope:full-stack

# Agent labels
agent:in-progress # Agent is actively working on this
agent:review      # Agent finished, needs human review
```

#### Milestones

One GitHub Milestone per phase (e.g., "Phase 0 — Foundation"). This gives you a progress bar, burndown, and serves as the single source of truth for which phase an issue belongs to.

#### GitHub Projects Board

A single board with columns:
- **Backlog** — created but not started
- **In Progress** — human or agent is working on it
- **In Review** — PR open, awaiting review
- **Done** — merged to main

---

## Workflow: Human + Agent Collaboration

### How a task flows

```
1. Human creates issue from roadmap
        ↓
2. Human assigns it (to self or to an agent)
        ↓
3. Agent (or human) reads the linked spec
        ↓
4. Agent creates branch, writes tests, implements (TDD)
        ↓
5. Agent opens PR, labels issue "agent:review"
        ↓
6. Human reviews PR (code review is always human)
        ↓
7. Human merges → issue auto-closes
```

### Rules for Agent-Driven Tasks

1. **One issue = one PR**. Keep scope small.
2. **Agent reads the spec first**. The issue should link to the relevant spec file.
3. **Agent does not merge**. Only humans merge PRs.
4. **Agent does not modify specs**. If behavior is unclear, the agent should ask (or a human updates the spec first).
5. **Human reviews every PR**. Agents write code; humans own quality.

### Rules for Human Coordination

1. **Assign before starting**. Avoid two people (or agents) working on the same task.
2. **Phase dependencies are real**. Don't start Phase 2 tasks until Phase 1's API is merged.
3. **Communicate blockers in issues**. If a task is stuck, comment on the issue.
4. **Use draft PRs** for work-in-progress to signal "I'm on this."

---

## File Layout

```
plans/
├── roadmap.md                              ← Phase breakdown + dependency graph
├── project-management.md                   ← This document (how we work)
└── decisions/                              ← Architecture Decision Records
    └── project-management-alternatives.md  ← Why we chose this approach
```

For the rationale behind choosing GitHub Issues + Markdown over Linear, Jira, pure Markdown, or other approaches, see [`decisions/project-management-alternatives.md`](decisions/project-management-alternatives.md).

### What stays in the repo vs. GitHub Issues

| In `plans/` (repo) | In GitHub Issues |
|---------------------|------------------|
| Phase breakdown | Individual tasks |
| Dependency graph | Assignment + status |
| Architecture decisions | Comments + discussion |
| Strategic roadmap | PR links |
| Sprint retrospective notes | Bug reports |
