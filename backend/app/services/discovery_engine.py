"""Multi-source discovery: Yelp (top venues), Eventbrite (indie/community events)
and Ticketmaster (tier-1 events), fetched concurrently.

Every fetcher swallows its own errors and returns [] so a flaky third-party API
can never break route generation: Gemini just falls back to its own knowledge.
"""
import asyncio
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv

load_dotenv()

HTTP_TIMEOUT = 5.0
DEFAULT_CITY = "Chicago, IL"

_COORDS_RE = re.compile(r"^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$")


def parse_city(city_string: str) -> Tuple[str, Optional[str]]:
    """'Austin, TX' -> ('Austin', 'TX'). State code is None unless it is a 2-letter code."""
    parts = [p.strip() for p in (city_string or DEFAULT_CITY).split(",") if p.strip()]
    if not parts:
        return "Chicago", "IL"
    state = parts[1].upper() if len(parts) > 1 and len(parts[1]) == 2 and parts[1].isalpha() else None
    return parts[0], state


def _window(date: str) -> Tuple[datetime, datetime]:
    """One-day UTC window: now -> +24h, or the following 24h for 'Tomorrow'."""
    start = datetime.utcnow() + (timedelta(hours=24) if date == "Tomorrow" else timedelta())
    return start, start + timedelta(hours=24)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def fetch_yelp(client: httpx.AsyncClient, city: str, neighborhood: str) -> List[Dict[str, Any]]:
    """Top-rated food / nightlife / cafe spots near the starting point."""
    key = os.getenv("YELP_API_KEY")
    if not key:
        return []
    try:
        params: Dict[str, Any] = {
            "categories": "food,nightlife,cafes",
            "sort_by": "rating",
            "limit": 20,  # over-fetch, then keep the best-reviewed 5
            "radius": 8000,
        }
        coords = _COORDS_RE.match(neighborhood or "")
        if coords:  # "Near Me" pre-fills exact coordinates
            params["latitude"], params["longitude"] = float(coords.group(1)), float(coords.group(2))
        else:
            params["location"] = f"{neighborhood}, {city}" if neighborhood else city

        resp = await client.get(
            "https://api.yelp.com/v3/businesses/search",
            params=params,
            headers={"Authorization": f"Bearer {key}"},
        )
        if resp.status_code != 200:
            print(f"Yelp returned {resp.status_code}")
            return []

        businesses = resp.json().get("businesses", [])
        # Rating alone surfaces places with 2 reviews; require some volume.
        solid = [b for b in businesses if (b.get("review_count") or 0) >= 20] or businesses
        solid.sort(key=lambda b: (b.get("rating") or 0, b.get("review_count") or 0), reverse=True)
        return [
            {
                "name": b.get("name"),
                "rating": b.get("rating"),
                "reviews": b.get("review_count"),
                "price": b.get("price"),
                "categories": [c.get("title") for c in b.get("categories", [])],
                "address": ", ".join((b.get("location") or {}).get("display_address", [])),
            }
            for b in solid[:5]
            if b.get("name")
        ]
    except Exception as e:
        print(f"Yelp fetch failed: {e}")
        return []


async def fetch_eventbrite(client: httpx.AsyncClient, city: str, date: str) -> List[Dict[str, Any]]:
    """Local community events, pop-ups and indie shows."""
    token = os.getenv("EVENTBRITE_PRIVATE_TOKEN")
    if not token:
        return []
    try:
        start, end = _window(date)
        resp = await client.get(
            "https://www.eventbriteapi.com/v3/events/search/",
            params={
                "location.address": city,
                "location.within": "15mi",
                "start_date.range_start": _iso(start),
                "start_date.range_end": _iso(end),
                "sort_by": "date",
                "expand": "venue",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code != 200:
            # Note: Eventbrite retired public event search for most accounts, so a
            # 404/403 here is expected; we just fall back to the other sources.
            print(f"Eventbrite returned {resp.status_code}")
            return []

        events = []
        for e in resp.json().get("events", [])[:5]:
            venue = e.get("venue") or {}
            events.append(
                {
                    "name": (e.get("name") or {}).get("text"),
                    "venue": venue.get("name"),
                    "address": (venue.get("address") or {}).get("localized_address_display"),
                    "start": (e.get("start") or {}).get("local"),
                }
            )
        return [e for e in events if e["name"]]
    except Exception as e:
        print(f"Eventbrite fetch failed: {e}")
        return []


async def fetch_ticketmaster(client: httpx.AsyncClient, city_string: str, date: str) -> List[Dict[str, Any]]:
    """Tier-1 ticketed events (same query the app has always used)."""
    key = os.getenv("TICKETMASTER_API_KEY")
    if not key:
        return []
    try:
        city, state_code = parse_city(city_string)
        start, end = _window(date)
        params: Dict[str, Any] = {
            "apikey": key,
            "city": city,
            "startDateTime": _iso(start),
            "endDateTime": _iso(end),
            "sort": "date,asc",
            "size": 3,
        }
        if state_code:
            params["stateCode"] = state_code

        resp = await client.get("https://app.ticketmaster.com/discovery/v2/events.json", params=params)
        if resp.status_code != 200:
            print(f"Ticketmaster returned {resp.status_code}")
            return []

        out = []
        for e in resp.json().get("_embedded", {}).get("events", []):
            venues = e.get("_embedded", {}).get("venues") or [{}]
            out.append(
                {
                    "name": e.get("name", "Unknown Event"),
                    "venue": venues[0].get("name", "Unknown Venue"),
                    "start": (e.get("dates", {}).get("start", {}) or {}).get("localTime"),
                }
            )
        return out
    except Exception as e:
        print(f"Ticketmaster fetch failed: {e}")
        return []


async def get_city_context(
    city: str,
    neighborhood: str = "",
    date: str = "",
    time: Optional[str] = None,
) -> Dict[str, Any]:
    """Run all three sources concurrently so the user's wait is the slowest call,
    not the sum. `date` is the timing bucket ("Right Now"/"Later Tonight"/"Tomorrow");
    `time` is the exact start the user picked (e.g. "7:30 PM"), if any."""
    city = city or DEFAULT_CITY
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        yelp, eventbrite, ticketmaster = await asyncio.gather(
            fetch_yelp(client, city, neighborhood),
            fetch_eventbrite(client, city, date),
            fetch_ticketmaster(client, city, date),
        )
    print(f"City context: {len(yelp)} Yelp, {len(eventbrite)} Eventbrite, {len(ticketmaster)} Ticketmaster")
    return {
        "when": f"{date} {time}".strip() if (date or time) else None,
        "top_yelp_venues": yelp,
        "eventbrite_events": eventbrite,
        "ticketmaster_events": ticketmaster,
    }
