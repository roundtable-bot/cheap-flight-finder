## What changed and why

## How I tested it

<!-- For provider changes, include live script output or a screenshot. -->

## Checklist

- [ ] `python3 -m unittest discover tests` passes
- [ ] Ran `python3 tools/build.py` and committed the updated `claude-web/` files
- [ ] Added an entry under "Unreleased" in `CHANGELOG.md`
- [ ] No anti-bot token replay, IP rotation, or private API calls
- [ ] The agent still never books or pays without explicit user confirmation
