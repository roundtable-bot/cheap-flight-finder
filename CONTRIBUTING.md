# Contributing

Thanks for helping people pay less. Fixes for sites that changed, new providers, and new money-saving skills are all welcome.

## Project layout

```
skills/<skill>/SKILL.md      The skill: instructions any agent can follow
skills/<skill>/scripts/      Optional helper scripts the skill runs
claude-web/<skill>.md        Generated paste version (don't edit by hand)
tests/                       Offline tests (no network)
tools/build.py               Builds claude-web/ and dist/<skill>.zip
.claude-plugin/              Claude Code plugin + marketplace manifests
```

## Development

You need Python 3.8+ and, for `search_sites.js`, Node.js 18+.

```bash
python3 -m unittest discover tests   # offline tests
node --test tests/*.test.js          # offline browser-helper tests
python3 tools/build.py               # regenerate claude-web/ and dist/
```

**After changing anything in `skills/`, run `python3 tools/build.py` and commit the updated `claude-web/` file.** CI fails if it's out of date.

To try a change with a live search:

```bash
cd skills/cheap-flight-finder
python3 scripts/google_flights.py SFO NYC 2026-12-01
node scripts/search_sites.js SFO NYC 2026-12-01
```

To try the whole skill in Claude Code, copy the folder to `~/.claude/skills/` (or run `claude --plugin-dir .` from the repo root) and ask for a flight.

## Guidelines

- **Keep it portable.** `SKILL.md` must work for any agent, with or without a browser, a shell or internet access. Describe what to do in each case, and always fall back to giving links.
- **Keep scripts small and dependency-free.** Python scripts use only the standard library. Node scripts use only Playwright.
- **Respect the sites.** Load public search pages the way a person would, one search at a time. Don't replay anti-bot tokens, rotate IPs, or call private APIs. Try interactive CAPTCHAs through the normal browser UI with bounded attempts; if they remain unresolved, let the user finish in a visible browser or report the site as blocked.
- **Never let the agent spend money on its own.** Skills must require explicit user confirmation before booking or paying.
- **Report only real prices.** Skills must never guess prices, baggage rules or availability.
- **Write for everyone.** Use plain, simple English in skills and docs.

## Fixing a provider that broke

1. Open the site in a normal browser and check what changed: the URL format, the page layout, or a new block.
2. Update the URL template in `SKILL.md` and, if needed, in `scripts/search_sites.js` or `scripts/google_flights.py`.
3. Run a live search and include the output (or a screenshot) in your pull request.

## Adding a provider

Open an issue first. A good provider shows real, bookable prices on a public search page that can be reached with a plain URL. Add it to the URL table in `SKILL.md`, to `search_sites.js` if it works headless, and to the README.

## Adding a skill

Create `skills/<name>/SKILL.md` with `name`, `license` and `description` frontmatter ([Agent Skills format](https://agentskills.io)). Add any scripts under `skills/<name>/scripts/` and offline tests under `tests/`. Then run `python3 tools/build.py` and add the skill to the README table.

## Pull requests

- Keep each pull request focused on one change.
- Add an entry under "Unreleased" in [CHANGELOG.md](CHANGELOG.md).
- Make sure `python3 -m unittest discover tests`, `node --test tests/*.test.js` and `python3 tools/build.py --check` pass.

## Releasing (maintainers)

1. Move the "Unreleased" changes to a new version in `CHANGELOG.md`, and bump `version` in `.claude-plugin/plugin.json`.
2. Tag and push: `git tag v0.2.0 && git push --tags`. The release workflow builds the skill zips and attaches them to a GitHub release.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) and that you'll follow the [Code of Conduct](CODE_OF_CONDUCT.md).
