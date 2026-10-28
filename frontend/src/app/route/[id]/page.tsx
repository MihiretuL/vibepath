"use client";
import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";
import { HeartCrack, MapPin } from "lucide-react";
import { getCity, type Itinerary } from "../../../../lib/pathzu";
import {
  ShareActions,
  StartRouteButton,
  StepCard,
} from "../../../components/RouteParts";

export default function SharedRoutePage() {
  const params = useParams();
  const router = useRouter();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/route/${routeId}?timestamp=${Date.now()}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        setItinerary(data.data.full_json);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setErrorMsg(err.message || "Failed to load the shared vibe.");
      } finally {
        setLoading(false);
      }
    };

    if (routeId) fetchRoute();
  }, [routeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-pink-500 font-bold animate-pulse">
        Loading Vibe...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-8">
        <HeartCrack className="w-14 h-14 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          Pathzu Not Found
        </h1>
        <p className="text-neutral-400 mb-8">{errorMsg}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-white text-black font-bold rounded-full"
        >
          Create Your Own
        </button>
      </div>
    );
  }

  // Older routes have no `city`; getCity falls back to Chicago, IL.
  const city = getCity(itinerary);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30">
      <div className="w-full max-w-3xl mt-8 sm:mt-12 flex flex-col items-center pb-24">
        {/* Top Branding encouraging them to make their own */}
        <div
          onClick={() => router.push("/")}
          className="cursor-pointer text-center mb-12 hover:scale-105 transition-transform"
        >
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">
            Made with
          </p>
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Pathzu.
          </h1>
        </div>

        {/* The Shared Route */}
        {itinerary && itinerary.plan && (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="text-center mb-8 flex flex-col items-center">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
                {itinerary.title}
              </h2>
              <div className="flex justify-center gap-3">
                <span className="px-4 py-1.5 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50 uppercase tracking-wide">
                  Shared Vibe
                </span>
                <span className="px-4 py-1.5 bg-white/[0.05] text-neutral-300 rounded-full text-xs font-bold border border-white/[0.08] uppercase tracking-wide inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {city}
                </span>
              </div>
              {routeId && (
                <ShareActions itinerary={itinerary} routeId={routeId} />
              )}
            </div>

            <StartRouteButton itinerary={itinerary} />

            <div className="space-y-6 w-full max-w-2xl mx-auto">
              {itinerary.plan.map((step, index) => (
                <StepCard key={index} step={step} city={city} />
              ))}
            </div>

            {/* The Call to Action Loop */}
            <div className="mt-16 w-full bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">
                Ready to plan your next adventure?
              </h3>
              <p className="text-pink-200/70 text-sm mb-6">
                AI-generated itineraries for any vibe, any time.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold text-sm transition-all shadow-lg"
              >
                Try Pathzu Free
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
