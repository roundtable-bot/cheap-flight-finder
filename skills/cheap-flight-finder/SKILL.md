---
name: cheap-flight-finder
license: MIT
description: Find cheap flights and possible error fares by comparing Google Flights, Skyscanner, Cheapflights, TeaFlight, and Trip.com; works without a browser tool via bundled scripts. Use for flight searches, airfare comparisons, error pricing, mistake fares, glitch fares, or unusually cheap flights, including flexible dates and destinations.
---

# Cheap Flight Finder

Collect the trip details, search all five providers at the same time with identical details, and report the cheapest option you actually saw. Works with or without a browser: see step 2.

**Choose the search mode:** for "error pricing", "error fares", "mistake fares", or "glitch fares", use [Mistake-fare search](#mistake-fare-search). For ordinary cheapest-flight requests, follow steps 1–3. A low price alone does not prove a pricing mistake.

## 1. Collect the trip details

For an ordinary flight search, you need all of these before searching. Pull whatever the user already said from the conversation, then ask for the rest in **one** message (not one question at a time):

| # | Detail | Notes |
|---|--------|-------|
| 1 | **Trip type** | One-way or round trip |
| 2 | **Origin** | City or airport. If a city has several airports (London, NYC, Tokyo), ask whether any airport is OK |
| 3 | **Destination** | Same as origin |
| 4 | **Dates** | Departure date, plus return date for a round trip. Ask whether the dates are flexible (±3 days) |
| 5 | **Passengers** | Number of adults, children (ages), infants |
| 6 | **Cabin class** | Economy, premium economy, business, or first |
| 7 | **Stops** | Direct (nonstop) only, or connections OK |

Example question:

> To find you the cheapest flight, I need a few details:
> 1. One-way or round trip?
> 2. Flying from where, and to where?
> 3. Departure date (and return date)? Are the dates flexible?
> 4. How many passengers (adults / children / infants)?
> 5. Cabin class: economy, premium economy, business, or first?
> 6. Direct flights only, or are connections OK?

Convert cities to IATA codes (e.g. New York = NYC or JFK, London = LON) and dates to `YYYY-MM-DD` before searching.

## 2. Search

**Always attempt all five providers for a trip you compare.** In mistake-fare mode, first discover candidates, then compare the shortlist across all five. Pick the first route your tools allow:

1. **You can drive a browser** (browser/Playwright/Chrome tools, or a computer-use tool): search all five sites in the table below. Go to [Search with a browser](#search-with-a-browser).
2. **You can run shell commands** (e.g. a plain Claude Code install): run both bundled scripts at the same time. Go to [Search with the bundled scripts](#search-with-the-bundled-scripts).
3. **Neither:** give the user the prefilled links from the table below so they can compare the sites themselves.

### Search with the bundled scripts

The script paths are relative to this skill's folder; use the full path if you're running from somewhere else.

**One-time setup** for `search_sites.js` (needs Node.js; downloads a headless Chromium, about 150 MB). Run it without asking, and tell the user in one line that you're installing a headless browser to search the sites:

```bash
npm i --prefix ~/.cache/cheap-flight-finder playwright && ~/.cache/cheap-flight-finder/node_modules/.bin/playwright install chromium
```

If Chromium later fails to start because of missing system libraries, run `install --with-deps chromium` the same way; it may need sudo.

**Search** (run both commands in the same step, so the sites are searched at the same time):

```bash
python3 scripts/google_flights.py SFO NYC 2026-10-15 --nonstop &
node scripts/search_sites.js SFO NYC 2026-10-15 --nonstop &
wait
```

Both take the same options: `--return YYYY-MM-DD` (omit for one-way), `--adults N`, `--cabin economy|premium_economy|business|first`, `--nonstop`. `search_sites.js` automatically tries a visible verification checkbox and waits up to 15 seconds for the challenge to clear, using the bundled `captcha.js` helper. It recognizes reCAPTCHA, hCaptcha and Cloudflare challenge frames, but cannot solve image, audio or drag puzzles itself. For those, use [Handle CAPTCHAs automatically](#handle-captchas-automatically) if you have browser tools. Otherwise, `--headed` opens a visible browser and gives the user up to 3 minutes per site to finish an unresolved challenge. Tell them which site needs attention.

- `google_flights.py` needs only Python 3. It prints JSON: `search_url` (use it as the booking link) and `results`, sorted cheapest first, each with `price` (total for all passengers, taxes included), airlines, flight numbers, times, stops and duration. For round trips, the results are outbound flights priced at the round-trip total; the user picks the return flight on Google Flights.
- `search_sites.js` opens Skyscanner, Cheapflights, TeaFlight and Trip.com in parallel (about 40 seconds, longer for challenges) and prints JSON with one entry per site: `status` (`ok`, `blocked`, `error` or `skipped`), `url` (use it as the booking link) and `text` (the results page as plain text). Blocked entries also include a `reason`. Read the prices, airlines, flight numbers, times and stops out of `text`, and apply the same checks as a browser search (below). TeaFlight is `skipped` for round trips and non-economy cabins; fill in its form if you have a browser, otherwise give its link.

If a script fails (no Node.js, no internet, a network allowlist, or a site blocks the request), use whatever the other script returned. For each site you couldn't check, write "not checked" with the reason and give its prefilled link from the table below. Never report a one-site search as a full comparison: say which sites were checked.

These sites (except Google Flights) build their results with JavaScript, so plain web fetching can't read them. Don't try to replay their private data endpoints: they use anti-bot tokens.

### Search with a browser

| Provider | Search URL template |
|----------|---------------------|
| Google Flights | `https://www.google.com/travel/flights?q=Flights+from+{ORIG}+to+{DEST}+on+{DEPART}+through+{RETURN}+{CLASS}+{N}+passengers+nonstop&hl=en&curr=USD` |
| Skyscanner | `https://www.skyscanner.com/transport/flights/{orig}/{dest}/{yymmdd}/{yymmdd-return}/?adultsv2={N}&cabinclass={economy\|premiumeconomy\|business\|first}&preferdirects={true\|false}` |
| Cheapflights | `https://www.cheapflights.com/flight-search/{ORIG}-{DEST}/{DEPART}/{RETURN}/{CLASS}/{N}adults?sort=price_a` (add `&fs=stops=0` for direct only) |
| TeaFlight | `https://www.teaflight.com/US/page/search?depCity={ORIG}&arrCity={DEST}&goDate={DEPART}&adultCount={N}&childCount=0&babyCount=0&cabinType=2&cabinLevels=economy&tripType=oneway&locale=en-GB&currency=USD` (economy one-way; for other cabins or a round trip, fill in the form at `https://www.teaflight.com/US/page/home`) |
| Trip.com | `https://www.trip.com/flights/showfarefirst?dcity={orig}&acity={dest}&ddate={DEPART}&rdate={RETURN}&triptype={ow\|rt}&class=y&quantity={N}&nonstoponly=on&locale=en-US&curr=USD` (`class=y` is economy; for other cabins change the cabin filter on the page) |

How to fill in the templates:
- **One-way:** drop the return part. For Google, remove `through {RETURN}` and add `one way`. For Skyscanner and Cheapflights, remove the `/{RETURN}` segment. For Trip.com, remove `rdate`.
- **City codes:** Google, Cheapflights, TeaFlight and Trip.com accept city codes like `NYC`, so all of a city's airports are searched. Skyscanner uses its own city codes, e.g. `nyca` (New York) and `lond` (London).
- **Direct only:** TeaFlight has no nonstop filter. Read each result and skip any that say "Transfer".
- **Check the page:** these URLs are shortcuts. After a page loads, confirm it shows the right trip type, date, passengers, cabin and stops. If it doesn't, fill in the site's search form instead.

**Run the searches at the same time, not one after another.** Use whatever your environment has:
- **Subagents / parallel tasks** (best): start one per provider, all in the same step. Give each one the full trip details and the result format below.
- **Several browser tabs or parallel tool calls**: open all providers in the same step.
- **Only one browser**: go through the providers quickly, one after another, and say that you did this.

If a site shows a CAPTCHA (Skyscanner often does), follow [Handle CAPTCHAs automatically](#handle-captchas-automatically). Keep the other searches running meanwhile. If a site blocks access without an interactive challenge or won't load, write down "unavailable" for it, give its link, and continue.
If none of the sites can be reached, try [the bundled scripts](#search-with-the-bundled-scripts).

Each provider search should return its **3 cheapest** results that match **every** requirement (trip type, dates, passengers, cabin, stops):

```
provider | total price (all passengers, with currency) | airline(s) + flight numbers | depart → arrive times | stops (+ layover airports/durations) | total duration | baggage included? | booking link
```

Write down the **total price including taxes and fees** for all passengers. For ordinary comparisons, you don't need to go to checkout; mistake-fare candidates need the seller check below. If a site shows a crossed-out price next to a lower one, record the current price and mention the other. Note it if the price is "from" or per person only. If the dates are flexible, also check the provider's calendar or "flexible dates" view and note any cheaper day.

### Handle CAPTCHAs automatically

Try to complete an interactive challenge with your available browser tools before asking the user. Keep the same tab and session so a successful verification applies to the search. If a bundled script returned `blocked`, its browser session has closed: open that entry's `url` in your browser and inspect the new challenge there.

1. **Inspect the current challenge.** Read its instructions and take a fresh screenshot, including the challenge iframe if needed. Wait briefly if verification is already running. Use the normal page controls; don't replay tokens, change verification flags, or call private endpoints.
2. **Attempt what your tools support.** Click a verification checkbox. For an image grid, select the images that match the prompt, inspect any replacement tiles, and use its Verify/Next button. For a text puzzle, enter the answer you can read; for a slider or press-and-hold challenge, use the browser's supported drag or pointer actions. Only use an audio alternative if you can actually listen to it. Don't invent answers or pretend unsupported actions succeeded.
3. **Check the outcome.** Take a new snapshot after submitting. A click or a solver's answer is not proof of success: the challenge must clear and flight results must load. Confirm that the trip details and filters still match, then continue reading fares.
4. **Limit retries.** Allow at most two submitted attempts and 90 seconds of automatic challenge handling per provider, including replacement tiles and waits. Stop earlier if the site reports a lockout or your tools can't operate the challenge. Don't restart this allowance by reopening the site or rerunning a script; a script's checkbox attempt counts toward the limit.
5. **Fall back when necessary.** If the user can see and interact with the browser, ask them to finish the remaining challenge in that same tab, then resume. With only a shell, offer `--headed` when a visible browser is available. Otherwise report `blocked (CAPTCHA)` with the search link and continue comparing the other providers. Never count a challenge page as a checked fare.

This uses the agent's existing browser and visual abilities; it does not require a paid CAPTCHA service. Success depends on the challenge and the available tools.

### Mistake-fare search

This is an on-demand search for possible airline or seller pricing mistakes. Do not promise continuous monitoring, alerts, a complete worldwide scan, or a guaranteed error fare.

#### Set the search scope

Collect the departure airport(s), destination or allowed region ("anywhere" is valid), departure window, trip type and acceptable stay length for round trips, passengers, cabin, and stops. Ask for missing details together; reuse anything already supplied. Accept a month or date range instead of demanding exact dates. Ask whether nearby departure airports are allowed; do not silently include them. Apply any budget the user gives.

For example: "Find mistake fares from JFK or EWR to anywhere in Europe, departing in November 2026 for 5–9 nights, round trip, 1 adult, economy, connections OK, under $400 total."

#### Discover and compare candidates

1. **Look for recent leads.** If web search or a browser is available, check public [Secret Flying error-fare reports](https://www.secretflying.com/error-fares/) and search for `"mistake fare"` / `"error fare"` with the origin or region. Start with reports published in the last 48 hours. Open the original report and record its publication time, route, travel dates, cabin, currency, and link; search snippets and an updated archive date are not live quotes. Skip expired reports and trips outside the user's scope. A report is only a lead until repriced. If nothing recent matches, continue with live discovery; don't substitute an old deal as current.
2. **Look for live outliers.** Use Google Flights' destination exploration and date calendar within the permitted window; its [price insights](https://support.google.com/travel/answer/7664728?hl=en) can supply comparison evidence. For "anywhere", choose up to three destinations surfaced by those results or recent leads. With only a shell, use concrete routes from available leads or the user's list; if there are none, ask for a destination shortlist instead of claiming the scripts scan everywhere. Run `google_flights.py` for each exact route/date pair, with `--return` for round trips, sequentially. The scripts search exact dates; they do not discover error fares or historical prices on their own.
3. **Keep the scan bounded.** Unless the user requests a larger search, inspect up to six exact route/date combinations, including dates used for comparison, and take the best three candidates into step 2's five-provider comparison. A browser calendar can help select those dates. Keep round-trip stays within the allowed range and all other filters identical. State which routes and dates you actually checked. Search different trips sequentially; parallelize only the providers for the same trip. Existing CAPTCHA limits apply across the whole search, not afresh for each date.
4. **Record why the price is unusual.** Prefer a numeric typical-price value or range shown by a provider for that trip, with its source and scope. If unavailable, use the median of at least three other checked, comparable date totals for the same route, trip type, cabin, passengers, stops, baggage, and round-trip stay length; label it "sampled comparison", never "historical average". Exclude the candidate and duplicate listings of the same itinerary. If the comparison isn't like-for-like or has too few observations, write "baseline unavailable" and omit percentage savings. For a range, use its lower bound conservatively. Calculate `(baseline - candidate total) / baseline × 100` only with positive totals in the same currency.
5. **Prioritize evidence, not just price.** A discount of at least 50% against that baseline is a triage heuristic, not proof of an airline mistake. A recent, matching error-fare report is another reason to investigate. A normal sale, low-cost carrier fare, or a provider's "low price" badge alone is not enough to call something a mistake. Retain genuinely cheap alternatives separately if no candidate has strong evidence.

#### Recheck with the seller

For each shortlisted candidate, open the actual airline or travel agency offer and select the exact outbound **and return** flights when applicable. Check the latest total for every passenger, including taxes, mandatory fees, and the user's required baggage. Confirm currency, cabin on every leg, dates, airports, stops, fare restrictions, and eligibility for any advertised discount. Compare with the airline's direct price when accessible; an agency-only fare can still be a candidate, but say where it was found.

Stop before submitting passenger details, holding a reservation, or paying. If the full total requires those steps, a login you cannot access, or unsupported browser interaction, report that seller verification is incomplete. The Google script's outbound result priced as a round trip does not verify a selected return flight. Search-page agreement across several providers does not replace this seller check.

Record the seller URL and UTC check time. If the price rises or disappears, discard the old amount from current offers and mark the lead "expired / price changed" with the new total if shown. This catches the stale listings Going describes as [ghost fares](https://help.going.com/hc/en-us/articles/16914277242900-What-types-of-deals-are-there). Don't count zero or negative prices, missing currency, per-person/whole-trip mismatches, reward tickets, or omitted mandatory costs as error-fare evidence.

#### Report the findings

Lead with the strongest currently checked candidate, then a compact table:

`Route and dates | Total / currency | Comparison baseline and source | Discount | Status | Seller link / checked at (UTC)`

Use these labels consistently:

- **Possible error fare — seller price checked:** an unusually large like-for-like discount or a recent matching error-fare report, plus a complete seller check. Say which evidence triggered the flag; the cause remains unconfirmed.
- **Unverified lead:** a report or search result whose full seller total could not be checked. Keep these separate from checked offers; do not imply availability.
- **Low fare — cause unknown:** a seller-checked cheap offer without enough evidence of a pricing mistake.
- **Expired / price changed:** the reported amount could not be reproduced. Exclude it from the cheapest current offer.

Include the normal flight details from step 3, the evidence link and timestamp, all-passenger/full-trip totals, restrictions, checked providers, and any gaps. If none qualify, say "No seller-checked mistake-fare candidates found in the routes and dates checked" and show any ordinary low fares separately. Do not invent a candidate to fill the table. Briefly note that a checked price does not guarantee ticket issuance or that a possible mistake fare will be honored. Never book automatically.

## 3. Compare and report

1. Put all results in the same currency and compare total price for all passengers. Exclude any result that breaks a requirement. A cheap fare with a stop doesn't count when the user asked for direct.
2. Watch for hidden costs: basic-economy fares with no carry-on, checked-bag fees on low-cost carriers, self-transfer itineraries (separate tickets, no protection if you miss a connection), and overnight layovers. When these costs change which option is really cheapest, say so.
3. If the same flight appears on several sites, list it once with the lowest price and say where that price was found.
4. If several flights tie for cheapest, show the shortest first and list the other tied flights on one line (flight number and times), so the user can pick a departure time.
5. Write "not shown" for anything a site didn't show (e.g. baggage). Never guess.
6. For a one-way trip, leave out the Return line.

Use rendered Markdown, with the cheapest fare first and a compact comparison table. For mistake-fare searches, use that mode's status labels and evidence table, plus the flight details below. Do not wrap your actual reply in a code block. This example uses illustrative fares; replace every detail with results from the current search:

```markdown
**Cheapest: $412 USD total on Skyscanner**

JFK → LAX · Round trip · 2 adults · Economy

- **Outbound:** United UA123 · JFK 08:05 → LAX 11:20 · Nonstop · 6h 15m
- **Return:** United UA456 · LAX 17:00 → JFK 01:30 the next day · Nonstop · 5h 30m
- **Baggage:** carry-on included; checked bag $35 each way.
- **Search:** [View this trip on Skyscanner](SEARCH_URL)

| Provider | Total (USD) | Airline / stops | Notes |
|----------|------------:|-----------------|-------|
| **Skyscanner** | **$412** | United / nonstop | Lowest fare |
| Google Flights | $418 | United / nonstop | |
| Cheapflights | $431 | Delta / nonstop | |
| TeaFlight | $425 | United / nonstop | |
| Trip.com | $436 | United / nonstop | |

**Flexible dates:** departing November 3 instead saves $60.

Prices checked October 12, 2026 at 14:05 UTC. Confirm the fare before booking.
```

Include a flexible-date alternative only if you checked it; use the provider's real search URL in place of `SEARCH_URL`. Include layover airports and durations for connecting flights. Each compared price must cover all passengers and the full trip.

Rules:
- Report only prices you actually saw in this search. Never guess or reuse old prices.
- Mention flexible-date savings, or a nearby airport that is much cheaper, only as an extra. Don't swap it in for what the user asked for.
- **Never book or pay** unless the user clearly confirms that exact flight and price. Booking is the user's decision.
