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
  plan: PlanStep[];
}

export const getCity = (itinerary?: { city?: string } | null): string =>
  itinerary?.city || DEFAULT_CITY;

export const openMapsToSpot = (step: PlanStep, city: string) =>
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${step.place}, ${city}`)}`,
    "_blank",
  );

// Pins the exact destination in the Uber app. Coordinates are only added when
// the step has them (older routes won't).
export const requestUberToSpot = (step: PlanStep, city: string) => {
  let url =
    `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
    `&dropoff[nickname]=${encodeURIComponent(step.place)}` +
    `&dropoff[formatted_address]=${encodeURIComponent(step.formatted_address || `${step.place}, ${city}`)}`;
  if (step.lat != null && step.lng != null) {
    url += `&dropoff[latitude]=${step.lat}&dropoff[longitude]=${step.lng}`;
  }
  window.open(url, "_blank");
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
  return { title, text, url, body: `${text}\n\n${url}` };
};

export const canNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export const textPlan = (itinerary: Itinerary, routeId: string) => {
  const { body } = buildShareMessage(itinerary, routeId);
  window.location.href = `sms:?&body=${encodeURIComponent(body)}`;
};

// Native OS share drawer where supported, SMS otherwise.
export const sharePlan = async (itinerary: Itinerary, routeId: string) => {
  const { title, text, url } = buildShareMessage(itinerary, routeId);
  if (canNativeShare()) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User dismissed the drawer; nothing to do.
    }
    return;
  }
  textPlan(itinerary, routeId);
};

export const copyPlanLink = async (routeId: string) => {
  await navigator.clipboard.writeText(`${window.location.origin}/route/${routeId}`);
};

// --- City auto-detection -------------------------------------------------

const GEO_TIMEOUT_MS = 6000;

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

const cityFromCoords = async (lat: number, lng: number) => {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    { signal: AbortSignal.timeout(GEO_TIMEOUT_MS) },
  );
  const d = await res.json();
  // principalSubdivisionCode looks like "US-IL"
  const stateCode = (d.principalSubdivisionCode || "").split("-")[1];
  return formatCity(d.city || d.locality, stateCode, d.countryCode, d.countryName);
};

const cityFromIp = async () => {
  const res = await fetch("https://ipapi.co/json/", {
    signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
  });
  const d = await res.json();
  return formatCity(d.city, d.region_code, d.country_code, d.country_name);
};

// Browser geolocation first; if it's denied, times out, or the reverse lookup
// fails, fall back to IP so detection almost never comes up empty.
export const detectCity = async (): Promise<string | null> => {
  try {
    const { coords } = await getBrowserPosition();
    const city = await cityFromCoords(coords.latitude, coords.longitude);
    if (city) return city;
  } catch {
    // fall through to IP lookup
  }
  try {
    return await cityFromIp();
  } catch {
    return null;
  }
};
