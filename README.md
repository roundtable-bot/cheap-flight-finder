<img src="assets/icon.svg" width="64" height="64" alt="">

# Cheap Flight Finder

[![CI](https://github.com/roundtable-bot/cheap-flight-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/roundtable-bot/cheap-flight-finder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Find cheap flights with your AI agent or assistant. Cheap Flight Finder is a plain [Agent Skills](https://agentskills.io) folder, so it works with Claude Code, Claude.ai, Codex and any other agent that can read a `SKILL.md`.

## Skills

| Skill | What it does |
|-------|--------------|
| [`cheap-flight-finder`](skills/cheap-flight-finder/SKILL.md) | Asks for your trip details, searches Google Flights, Skyscanner, Cheapflights, TeaFlight and Trip.com at the same time, and reports the cheapest option with a booking link. |

### cheap-flight-finder

Ask your agent something like *"Find me the cheapest flight from San Francisco to New York on Oct 15"*. It will:

1. **Ask for anything missing**, in one message: one-way or round trip, origin, destination, dates, passengers, cabin class, and direct or connecting.
2. **Search all five sites at the same time** with the same details.
3. **Compare total prices** (all passengers, taxes included), drop results that break your requirements, and flag hidden costs like bag fees and basic-economy fares.
4. **Report the cheapest option** with a comparison table, then wait. It never books or pays without your explicit confirmation.

#### Example reply

*Illustrative fares, not a live quote.*

**Cheapest: $238 USD total on Cheapflights**

San Francisco → New York · One way · 1 adult · Economy

- **Flight:** Frontier · SFO 22:14 → EWR 10:33 the next day
- **Journey:** 1 stop in Atlanta (2h 09m layover) · 9h 19m total
- **Baggage:** carry-on and checked bags cost extra.

| Provider | Total (USD) | Notes |
|----------|------------:|-------|
| **Cheapflights** | **$238** | Lowest fare; 1 stop |
| Google Flights | $247 | 1 stop |
| TeaFlight | $249 | 1 stop |
| Trip.com | $249 | 1 stop; carry-on included |
| Skyscanner | $255 | 1 stop |

The actual reply includes a link to the matching search and the time prices were checked. Confirm the fare and baggage costs before booking.

#### How it searches

The skill picks the best route for the tools the agent has:

| Agent has | What happens |
|-----------|--------------|
| A browser tool (Playwright, Chrome, computer use) | Searches all five sites in parallel in the browser. |
| A shell (e.g. Claude Code) | Runs the bundled scripts in parallel: [`google_flights.py`](skills/cheap-flight-finder/scripts/google_flights.py) (Python 3 standard library only) and [`search_sites.js`](skills/cheap-flight-finder/scripts/search_sites.js) (headless Chromium for the other four sites). The first run installs Playwright and Chromium (about 150 MB) into `~/.cache/cheap-flight-finder`. |
| Neither | Gives you prefilled search links for all five sites. |

The reply always says which sites were actually checked. If a site shows a CAPTCHA (Skyscanner often does), the agent first tries to complete it with its browser tools, including image or text challenges it can read. Attempts are limited to two submissions and 90 seconds per site. If it can't finish and you can see the browser, it asks you to solve the challenge and then carries on. Otherwise the site is reported as "blocked", with a link you can open yourself.

## Install

### Codex CLI

With Git and Codex CLI installed, run these commands in a Bash or zsh terminal:

```bash
git clone https://github.com/roundtable-bot/cheap-flight-finder.git
mkdir -p ~/.agents/skills/cheap-flight-finder
cp -R cheap-flight-finder/skills/cheap-flight-finder/. ~/.agents/skills/cheap-flight-finder/
codex
```

In Codex, use the skill by name:

```text
$cheap-flight-finder Find a one-way economy flight from SFO to NYC on December 1, 2026, for one adult. Connections are OK.
```

This installs the skill for your user account in `~/.agents/skills/`, as described in the [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills). If Codex was already open, start a new session. To update the skill later, pull the latest changes in your clone and repeat the copy command.

### Claude Code CLI

Run these commands in your terminal to add the marketplace and install the plugin for your user account:

```bash
claude plugin marketplace add roundtable-bot/cheap-flight-finder
claude plugin install cheap-flight-finder@cheap-flight-finder --scope user
claude
```

Then invoke the installed skill inside Claude Code:

```text
/cheap-flight-finder:cheap-flight-finder Find a one-way economy flight from SFO to NYC on December 1, 2026, for one adult. Connections are OK.
```

You can also run `/plugin marketplace add roundtable-bot/cheap-flight-finder` and `/plugin install cheap-flight-finder@cheap-flight-finder` inside an existing Claude Code session. See [Claude Code's plugin installation guide](https://code.claude.com/docs/en/discover-plugins).

Both installation methods require access to the GitHub repository while it is private. If authentication fails, sign in with `gh auth login` and configure Git with `gh auth setup-git`, then retry.

### Claude.ai

- **As a skill:** download `cheap-flight-finder.zip` from the [latest release](https://github.com/roundtable-bot/cheap-flight-finder/releases/latest), then upload it under Settings → Capabilities → Skills. Code execution must be turned on.
- **By pasting:** copy [`claude-web/cheap-flight-finder.md`](claude-web/cheap-flight-finder.md) into a Project's instructions. The scripts are included at the bottom.

Claude.ai has no browser it can control, and its code sandbox usually can't reach flight sites. Expect live prices from Google Flights at most (if you allow the sandbox internet access), plus links for the other sites.

### Other skill-aware agents

Copy the entire `skills/cheap-flight-finder` folder into your agent's skills directory, including its bundled scripts.

### Any other assistant

Paste [`claude-web/cheap-flight-finder.md`](claude-web/cheap-flight-finder.md) into its system prompt or custom instructions.

## Requirements

| For | You need |
|-----|----------|
| Asking, comparing and links | Nothing |
| Live Google Flights prices without a browser | Python 3.8+ and internet access |
| Live prices from the other four sites without a browser | Node.js 18+ and about 150 MB of disk for Chromium. On Linux, Chromium may need system libraries (`npx playwright install-deps chromium`). |

## Run the scripts yourself

```bash
cd skills/cheap-flight-finder
python3 scripts/google_flights.py SFO NYC 2026-10-15 --nonstop

npm i --prefix ~/.cache/cheap-flight-finder playwright
~/.cache/cheap-flight-finder/node_modules/.bin/playwright install chromium
node scripts/search_sites.js SFO NYC 2026-10-15 --nonstop
```

Both accept `--return YYYY-MM-DD`, `--adults N`, `--cabin economy|premium_economy|business|first` and `--nonstop`, and print JSON. `search_sites.js` automatically tries verification checkboxes and waits up to 15 seconds for the challenge to clear. It detects reCAPTCHA, hCaptcha and Cloudflare widgets but cannot solve image, audio or drag puzzles itself; those need the skill's browser-agent flow or your help. Add `--headed` for a visible browser that waits up to 3 minutes for you to finish an unresolved challenge. No solver subscription or API key is required.

## Limitations

- **Sites change.** The scripts read pages that the sites don't publish as an official API. When a site changes its layout, it may stop returning results until the script is updated. [Report it](https://github.com/roundtable-bot/cheap-flight-finder/issues/new?template=provider_broken.yml).
- **Prices move.** Fares change by the minute and can differ by country, currency and login. Always confirm the price on the booking page.
- **Some sites block bots.** Skyscanner usually shows a CAPTCHA to headless browsers. TeaFlight's direct link only covers one-way economy searches; other searches fall back to its link.
- **Baggage and fare rules** are often not shown in search results. The skill writes "not shown" rather than guessing.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Google, Skyscanner, Cheapflights (KAYAK), TeaFlight or Trip.com. All trademarks belong to their owners.

The scripts load the same public search pages a person would, one search at a time. Each site has its own terms of use; you are responsible for using this tool in line with them. Don't use it for bulk scraping or reselling data. Prices are shown as found and may be wrong or out of date. The agent never books or pays on its own.

## Contributing

Contributions are welcome: fixes for sites that changed, new providers, and new money-saving skills. See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security issues as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE).
