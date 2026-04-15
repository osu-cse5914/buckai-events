# Frontend Tooling Evaluation

Date: 2026-04-15

## Goal

Evaluate whether this project should move toward:

- OXC / Oxlint / Oxfmt
- Rolldown
- Vite+

and reduce or replace the current ESLint-centered workflow.

## Current stack

- Vite for app development
- Vitest for unit tests
- ESLint for linting
- existing package-manager / workspace scripts

## Evaluation

### OXC / Oxlint / Oxfmt

Pros:

- materially faster lint and format runs than ESLint + Prettier
- ESLint rule compatibility is improving
- good fit for large monorepos and AI-assisted workflows where feedback speed matters

Risks:

- not every ESLint rule/plugin setup maps cleanly yet
- migration needs a rule parity audit first

Recommendation:

- good candidate for an incremental future migration
- start by trialing Oxlint in parallel with ESLint before removing ESLint entirely

### Rolldown

Pros:

- promising production-build performance
- aligned with the Vite ecosystem

Risks:

- ecosystem compatibility should still be validated against this repo's exact plugin chain
- build and dev parity must be verified before replacing the current bundler path

Recommendation:

- worth piloting once the app-shell / route refactors settle
- do not switch production builds blindly without plugin compatibility checks

### Vite+

Pros:

- unified command surface for build / check / test workflows
- aligns with the VoidZero stack direction

Risks:

- still early for a repo that already has established scripts and CI assumptions
- adopting it now would couple several tooling changes together instead of isolating risk

Recommendation:

- not the next immediate change for this repo
- revisit after smaller, lower-risk adoptions like Oxlint or Rolldown trials

## Suggested migration order

1. Pilot Oxlint in parallel with ESLint.
2. If rule parity is acceptable, replace ESLint in CI and local scripts.
3. Trial Rolldown for production builds on a branch and compare output / plugin behavior.
4. Re-evaluate Vite+ only after the above are stable.

## Conclusion

- OXC: yes, likely valuable soon
- Rolldown: promising, but should be validated first
- Vite+: interesting, but too broad for the next immediate tooling change
