// Shared route types and helpers.
// Older saved routes in Supabase `full_json` may lack `city`, `lat`, `lng`
// and `formatted_address`, so every one of those is optional here.

export const DEFAULT_CITY = "Chicago, IL";

export const QUICK_CITIES = [
  "Chicago, IL",
  "New York, NY",
  "Austin, TX",
  "Miami, FL",
  "Los Angeles, CA",
];

// Example neighborhoods for the "Where are we starting?" placeholder.
const CITY_START_EXAMPLES: Record<string, string> = {
  "Chicago, IL": "Wicker Park, Lincoln Park, Clark & Belmont...",
  "New York, NY": "West Village, SoHo, Williamsburg...",
  "Austin, TX": "South Congress, East 6th, Zilker...",
  "Miami, FL": "Wynwood, South Beach, Brickell...",
  "Los Angeles, CA": "Silver Lake, Venice, Koreatown...",
};

export const startPlaceholder = (city: string) =>
  `e.g. ${CITY_START_EXAMPLES[city] || `a neighborhood or address in ${city.split(",")[0].trim()}...`}`;

export interface PlanStep {
  time?: string;
  title?: string;
  place: string;
  description?: string;
  cost_estimate?: string;
  action?: string;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  formatted_address?: string | null;
}

export interface Itinerary {
  id?: string;
  title?: string;
  vibe?: string;
  weather?: string;
  outfit_tip?: string;
  city?: string;
  transit?: string; // mode the route was built for; absent on older routes
  plan: PlanStep[];
}

export const getCity = (itinerary?: { city?: string } | null): string =>
  itinerary?.city || DEFAULT_CITY;

export const openMapsToSpot = (step: PlanStep, city: string) =>
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${step.place}, ${city}`)}`,
    "_blank",
  );

// Universal link that pre-fills the exact destination in the Uber app. Used as
// an <a href> so the OS hands off to the app. Coordinates are only added when
// the step has them (older routes won't).
export const uberLinkToSpot = (step: PlanStep, city: string): string => {
  let url =
    `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
    `&dropoff[nickname]=${encodeURIComponent(step.place)}` +
    `&dropoff[formatted_address]=${encodeURIComponent(step.formatted_address || `${step.place}, ${city}`)}`;
  if (step.lat != null && step.lng != null) {
    url += `&dropoff[latitude]=${step.lat}&dropoff[longitude]=${step.lng}`;
  }
  return url;
};

export const buildShareMessage = (itinerary: Itinerary, routeId: string) => {
  const city = getCity(itinerary);
  const title = itinerary.title || "Pathzu Route";
  const url = `${window.location.origin}/route/${routeId}`;
  const stops = itinerary.plan
    .slice(0, 3)
    .map((step, i) => `${i + 1}. ${step.place} (${step.time || "TBD"})`)
    .join("\n");
  const text = `Check out this ${city} plan on Pathzu: "${title}"\n\n${stops}`;
  return { title, text, url };
};

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

// One share action: native share sheet where available (mobile); if that is
// unsupported or fails, copy the link instead. Dismissing the sheet is not a
// failure, so it must not trigger the copy fallback.
export const sharePlan = async (
  itinerary: Itinerary,
  routeId: string,
): Promise<ShareResult> => {
  const { title, text, url } = buildShareMessage(itinerary, routeId);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
};

// --- City auto-detection -------------------------------------------------

const GEO_TIMEOUT_MS = 6000;

export interface DetectedLocation {
  city: string; // "City, ST" (US/CA) or "City, Country"
  // Neighborhood or coordinates to pre-fill "Where are we starting?".
  // null when we only know the city (IP fallback), so the user types it.
  start: string | null;
}

// "City, ST" for US/Canada; "City, Country" elsewhere (the backend only reads
// a 2-letter state code, so a country name is simply ignored by Ticketmaster).
const formatCity = (
  city?: string,
  stateCode?: string,
  countryCode?: string,
  countryName?: string,
): string | null => {
  if (!city) return null;
  if (stateCode && (countryCode === "US" || countryCode === "CA")) {
    return `${city}, ${stateCode}`;
  }
  return countryName ? `${city}, ${countryName}` : city;
};

const getBrowserPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEO_TIMEOUT_MS,
    });
  });

const locationFromCoords = async (
  lat: number,
  lng: number,
): Promise<DetectedLocation | null> => {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    { signal: AbortSignal.timeout(GEO_TIMEOUT_MS) },
  );
  const d = await res.json();
  // principalSubdivisionCode looks like "US-IL"
  const stateCode = (d.principalSubdivisionCode || "").split("-")[1];
  const cityName = d.city || d.locality;
  const city = formatCity(cityName, stateCode, d.countryCode, d.countryName);
  if (!city) return null;
  // `locality` is often the neighborhood; if it just repeats the city, fall
  // back to exact coordinates, which the backend/Gemini already understand.
  const start =
    d.locality && d.locality !== d.city
      ? d.locality
      : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { city, start };
};

const locationFromIp = async (): Promise<DetectedLocation | null> => {
  const res = await fetch("https://ipapi.co/json/", {
    signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
  });
  const d = await res.json();
  const city = formatCity(d.city, d.region_code, d.country_code, d.country_name);
  return city ? { city, start: null } : null;
};

// Browser geolocation first; if it's denied, times out, or the reverse lookup
// fails, fall back to IP so detection almost never comes up empty.
export const detectLocation = async (): Promise<DetectedLocation | null> => {
  try {
    const { coords } = await getBrowserPosition();
    const found = await locationFromCoords(coords.latitude, coords.longitude);
    if (found) return found;
  } catch {
    // fall through to IP lookup
  }
  try {
    return await locationFromIp();
  } catch {
    return null;
  }
};
