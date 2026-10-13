#!/usr/bin/env node
// Open Skyscanner, Cheapflights, TeaFlight and Trip.com in a headless browser at the
// same time and print each results page as text (JSON). Google Flights: use google_flights.py.
//
//   node search_sites.js SFO NYC 2026-10-15
//   node search_sites.js JFK LAX 2026-11-10 --return 2026-11-17 --adults 2 --cabin business --nonstop
//
// Tries verification checkboxes automatically. --headed allows manual fallback for puzzles.
//
// Needs Playwright + Chromium; see SKILL.md for the one-time setup.
const os = require('os'), path = require('path');
const { inspectCaptcha, handleCaptcha } = require('./captcha');
const { chromium } = require(require.resolve('playwright', {
  paths: [process.cwd(), path.join(os.homedir(), '.cache/cheap-flight-finder/node_modules')],
}));

const a = { adults: 1, cabin: 'economy', nonstop: false, headed: false, wait: 30 };
const pos = [];
for (let i = 2; i < process.argv.length; i++) {
  const v = process.argv[i];
  if (v === '--nonstop') a.nonstop = true;
  else if (v === '--headed') a.headed = true;
  else if (v.startsWith('--')) a[v.slice(2)] = process.argv[++i];
  else pos.push(v);
}
const [ORIG, DEST, DEPART] = pos.map(s => s.toUpperCase());
const RET = a.return, N = +a.adults, C = a.cabin;
if (!DEPART) { console.error('usage: search_sites.js ORIG DEST YYYY-MM-DD [--return YYYY-MM-DD] [--adults N] [--cabin economy|premium_economy|business|first] [--nonstop] [--headed]'); process.exit(2); }

const skyCity = c => ({ NYC: 'nyca', LON: 'lond', PAR: 'pari', TYO: 'tyoa', WAS: 'wasa', CHI: 'chia', MIL: 'mila', ROM: 'rome' })[c] || c.toLowerCase();
const yymmdd = d => d.slice(2).replace(/-/g, '');
const sites = {
  skyscanner: `https://www.skyscanner.com/transport/flights/${skyCity(ORIG)}/${skyCity(DEST)}/${yymmdd(DEPART)}/${RET ? yymmdd(RET) + '/' : ''}?adultsv2=${N}&cabinclass=${C.replace('_', '')}&preferdirects=${a.nonstop}`,
  cheapflights: `https://www.cheapflights.com/flight-search/${ORIG}-${DEST}/${DEPART}/${RET ? RET + '/' : ''}${{ premium_economy: 'premium' }[C] || C}/${N}adults?sort=price_a${a.nonstop ? '&fs=stops=0' : ''}`,
  teaflight: RET || C !== 'economy' ? null :
    `https://www.teaflight.com/US/page/search?depCity=${ORIG}&arrCity=${DEST}&goDate=${DEPART}&adultCount=${N}&childCount=0&babyCount=0&cabinType=2&cabinLevels=economy&tripType=oneway&locale=en-GB&currency=USD`,
  trip: `https://www.trip.com/flights/showfarefirst?dcity=${ORIG.toLowerCase()}&acity=${DEST.toLowerCase()}&ddate=${DEPART}${RET ? '&rdate=' + RET : ''}&triptype=${RET ? 'rt' : 'ow'}&class=${{ economy: 'y', premium_economy: 's', business: 'c', first: 'f' }[C]}&quantity=${N}${a.nonstop ? '&nonstoponly=on' : ''}&locale=en-US&curr=USD`,
};

(async () => {
  const browser = await chromium.launch({ headless: !a.headed });
  const out = {};
  await Promise.all(Object.entries(sites).map(async ([name, url]) => {
    if (!url) return (out[name] = { status: 'skipped', reason: 'link only covers one-way economy; use the form at https://www.teaflight.com/US/page/home' });
    const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1400, height: 1000 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
    const p = await ctx.newPage();
    try {
      await p.goto(url, { timeout: 60000 });
      await p.waitForTimeout(a.wait * 1000);
      const captcha = await handleCaptcha(p, { headed: a.headed });
      if (captcha.detected && captcha.cleared) await p.waitForTimeout(a.wait * 1000);
      for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 2500); await p.waitForTimeout(1500); }
      const { blocked, text: body } = await inspectCaptcha(p);
      const text = (body || '').replace(/\n\s*\n/g, '\n');
      out[name] = { status: blocked ? 'blocked' : 'ok', url, text: blocked ? '' : text.slice(0, 12000) };
      if (blocked) out[name].reason = 'Verification did not clear automatically; use a browser agent or solve it with --headed.';
    } catch (e) {
      out[name] = { status: 'error', url, error: e.message.split('\n')[0] };
    }
  }));
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
