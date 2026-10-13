"""Offline tests for skills/cheap-flight-finder/scripts/google_flights.py.

Run: python3 -m unittest discover tests
"""
import argparse
import json
import pathlib
import sys
import unittest
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "skills/cheap-flight-finder/scripts"))
import google_flights as gf  # noqa: E402


def leg(arrive_airport, airline, number):
    l = [None] * 23
    l[6], l[22] = arrive_airport, [airline, number]
    return l


def itinerary(price, airlines, legs, frm, to, dep, arr, dep_date, arr_date, minutes):
    return [["XX", airlines, legs, frm, dep_date, dep, to, arr_date, arr, minutes], [[None, price]]]


def page(top, other):
    data = [None, None, [top], [other]]
    return ("<html><script>AF_initDataCallback({key: 'ds:1', hash: '2', data:"
            + json.dumps(data) + ", sideChannel: {}});</script></html>")


NONSTOP = itinerary(382, ["JetBlue"], [leg("JFK", "B6", "116")], "SFO", "JFK", [6, 0], [14, 32], [2026, 10, 15], [2026, 10, 15], 332)
ONE_STOP = itinerary(247, ["Frontier"], [leg("DFW", "F9", "2930"), leg("EWR", "F9", "2472")],
                     "SFO", "EWR", [23, 59], [12, 50], [2026, 10, 15], [2026, 10, 16], 591)


class ParseTest(unittest.TestCase):
    def test_parses_both_sections(self):
        out = gf.parse(page([NONSTOP], [ONE_STOP]))
        self.assertEqual([f["price"] for f in out], [382, 247])

    def test_nonstop_fields(self):
        f = gf.parse(page([NONSTOP], []))[0]
        self.assertEqual(f["flights"], ["B6116"])
        self.assertEqual((f["from"], f["depart"], f["to"], f["arrive"]), ("SFO", "06:00", "JFK", "14:32"))
        self.assertEqual((f["stops"], f["via"], f["arrive_next_day"]), (0, [], False))

    def test_connection_fields(self):
        f = gf.parse(page([], [ONE_STOP]))[0]
        self.assertEqual(f["flights"], ["F92930", "F92472"])
        self.assertEqual((f["stops"], f["via"], f["arrive_next_day"]), (1, ["DFW"], True))

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            gf.parse("<html>consent page</html>")


class UrlTest(unittest.TestCase):
    def q(self, **kw):
        a = argparse.Namespace(**{"origin": "SFO", "dest": "NYC", "depart": "2026-10-15", "ret": None,
                                  "adults": 1, "cabin": "economy", "nonstop": False, "currency": "USD", **kw})
        return urllib.parse.parse_qs(urllib.parse.urlparse(gf.build_url(a)).query)["q"][0]

    def test_one_way(self):
        self.assertEqual(self.q(), "Flights from SFO to NYC on 2026-10-15 one way economy 1 adult")

    def test_round_trip_options(self):
        self.assertEqual(self.q(ret="2026-10-20", adults=2, cabin="premium_economy", nonstop=True),
                         "Flights from SFO to NYC on 2026-10-15 through 2026-10-20 premium economy 2 adults nonstop")


if __name__ == "__main__":
    unittest.main()
