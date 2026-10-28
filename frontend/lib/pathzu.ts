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
