#!/usr/bin/env python3
"""Fetch live Google Flights results without a browser (Python stdlib only).

Google Flights embeds its first page of results in the HTML, so a plain HTTP GET
is enough. Prints the cheapest itineraries as JSON.

  python3 google_flights.py SFO NYC 2026-10-14
  python3 google_flights.py JFK LAX 2026-11-10 --return 2026-11-17 --adults 2 --cabin business --nonstop
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"


def build_url(a):
    q = f"Flights from {a.origin} to {a.dest} on {a.depart}"
    q += f" through {a.ret}" if a.ret else " one way"
    q += f" {a.cabin.replace('_', ' ')} {a.adults} adult{'s' if a.adults > 1 else ''}"
    if a.nonstop:
        q += " nonstop"
    return "https://www.google.com/travel/flights?" + urllib.parse.urlencode(
        {"q": q, "hl": "en", "curr": a.currency})


def hhmm(t):
    t = (t or []) + [0, 0]
    return f"{t[0] or 0:02d}:{t[1] or 0:02d}"


def parse(html):
    m = re.search(r"AF_initDataCallback\(\{key: 'ds:1'.*?data:", html, re.S)
    if not m:
        raise ValueError("no results block found (blocked, consent page, or layout changed)")
    data, _ = json.JSONDecoder().raw_decode(html, m.end())
    out = []
    for section in (data[2], data[3]):  # "top flights", "other flights"
        for it in (section or [[]])[0] or []:
            info, price = it[0], it[1][0][1] if it[1] and it[1][0] else None
            legs = info[2]
            out.append({
                "price": price,
                "airlines": info[1],
                "flights": [f"{l[22][0]}{l[22][1]}" for l in legs],
                "from": info[3], "depart": hhmm(info[5]),
                "to": info[6], "arrive": hhmm(info[8]),
                "arrive_next_day": info[7] != info[4],
                "stops": len(legs) - 1,
                "via": [l[6] for l in legs[:-1]],
                "duration_min": info[9],
            })
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("origin"), p.add_argument("dest"), p.add_argument("depart", help="YYYY-MM-DD")
    p.add_argument("--return", dest="ret", help="YYYY-MM-DD; omit for one-way")
    p.add_argument("--adults", type=int, default=1)
    p.add_argument("--cabin", default="economy", choices=["economy", "premium_economy", "business", "first"])
    p.add_argument("--nonstop", action="store_true")
    p.add_argument("--currency", default="USD")
    p.add_argument("--top", type=int, default=5)
    a = p.parse_args()

    url = build_url(a)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US"})
    try:
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        flights = parse(html)
    except Exception as e:
        print(json.dumps({"error": str(e), "search_url": url}))
        sys.exit(1)
    if a.nonstop:
        flights = [f for f in flights if f["stops"] == 0]
    flights = sorted((f for f in flights if f["price"]), key=lambda f: (f["price"], f["duration_min"] or 0))
    print(json.dumps({
        "search_url": url,
        "note": "price is the total for all passengers incl. taxes; round trips list outbound flights at the round-trip total",
        "results": flights[:a.top],
    }, indent=1))


if __name__ == "__main__":
    main()
