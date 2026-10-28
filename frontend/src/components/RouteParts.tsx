"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Car,
  Check,
  Clock,
  DollarSign,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  canNativeShare,
  copyPlanLink,
  getCity,
  openMapsToSpot,
  requestUberToSpot,
  sharePlan,
  textPlan,
  type Itinerary,
  type PlanStep,
} from "../../lib/pathzu";

export const GLASS_CARD =
  "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300";

// Primary CTA above the step cards: one tap to an Uber pinned to Stop 1.
export function StartRouteButton({ itinerary }: { itinerary: Itinerary }) {
  const first = itinerary.plan?.[0];
  if (!first) return null;
  return (
    <button
      onClick={() => requestUberToSpot(first, getCity(itinerary))}
      className="w-full max-w-2xl mx-auto mb-8 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(168,85,247,0.25)] active:scale-[0.98] transition-all"
    >
      <Car className="w-5 h-5 shrink-0" />
      <span className="truncate">Start Route: Uber to {first.place}</span>
    </button>
  );
}

export function ShareActions({
  itinerary,
  routeId,
  children,
}: {
  itinerary: Itinerary;
  routeId: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);

  // navigator.share is only known on the client.
  useEffect(() => setNativeShare(canNativeShare()), []);

  const handleCopy = async () => {
    try {
      await copyPlanLink(routeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Couldn't copy the link. Try again!");
    }
  };

  const secondary = `px-5 py-3 ${GLASS_CARD} text-white rounded-full text-sm font-bold flex items-center gap-2 active:scale-95`;

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {nativeShare && (
        <button
          onClick={() => sharePlan(itinerary, routeId)}
          className="px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-full text-sm font-bold transition-all shadow-[0_5px_20px_rgba(255,255,255,0.1)] flex items-center gap-2 active:scale-95"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      )}
      <button
        onClick={() => textPlan(itinerary, routeId)}
        className={
          nativeShare
            ? secondary
            : "px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-full text-sm font-bold transition-all shadow-[0_5px_20px_rgba(255,255,255,0.1)] flex items-center gap-2 active:scale-95"
        }
      >
        <MessageSquare className="w-4 h-4" /> Text Plan
      </button>
      <button onClick={handleCopy} className={secondary}>
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {copied ? "Copied!" : "Copy Link"}
      </button>
      {children}
    </div>
  );
}

export function StepCard({
  step,
  city,
  onSwap,
  swapping = false,
}: {
  step: PlanStep;
  city: string;
  onSwap?: () => void;
  swapping?: boolean;
}) {
  return (
    <div
      className={`${GLASS_CARD} rounded-2xl p-6 flex flex-col relative overflow-hidden group`}
    >
      {/* The Vertical Accent Line */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>

      <div className="flex flex-col py-1 pl-6">
        <div className="mb-4">
          <span className="bg-white/[0.05] border border-white/[0.08] text-pink-400 font-bold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {step.time || "Time TBD"}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>

        <p className="text-pink-500 text-xs font-bold mb-3 tracking-wide flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> {step.place}
        </p>

        {/* Photos come from our FastAPI 302 proxy, so Next must not optimize them. */}
        {step.image_url && (
          <div className="w-full mb-4 overflow-hidden rounded-xl border border-white/[0.08] shadow-lg relative">
            <Image
              src={step.image_url}
              alt={step.place}
              width={600}
              height={400}
              unoptimized={true}
              className="w-full h-48 sm:h-56 object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}

        {step.cost_estimate && (
          <div className="mb-4">
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase bg-emerald-900/20 px-3 py-1.5 rounded-md border border-emerald-800/50 inline-flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> {step.cost_estimate}
            </span>
          </div>
        )}

        <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
          {step.description}
        </p>

        <div className="flex flex-wrap gap-3 mt-auto">
          <button
            onClick={() => openMapsToSpot(step, city)}
            className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" /> Google Maps
          </button>
          <button
            onClick={() => requestUberToSpot(step, city)}
            className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md flex items-center gap-2"
          >
            <Car className="w-4 h-4" /> Request Uber
          </button>
          {onSwap && (
            <button
              onClick={onSwap}
              disabled={swapping}
              className="bg-white/[0.05] border border-white/[0.1] text-neutral-300 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white/[0.1] hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {swapping ? (
                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {swapping ? "Swapping..." : "Swap this spot"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
