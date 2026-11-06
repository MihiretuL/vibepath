"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { GiMagicHat } from "react-icons/gi"; // magic-related icon
import { FaChess } from "react-icons/fa"; // any fun icon
import Link from "next/link";
import {
  Wind,
  Apple,
  Guitar,
  TreePalm,
  Clapperboard,
  Activity,
  Archive,
  Brain,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Cloud,
  Coffee,
  Crown,
  Dog,
  Flame,
  Footprints,
  Heart,
  Loader2,
  LocateFixed,
  Lock,
  MapPin,
  MessageCircle,
  PartyPopper,
  Plane,
  Search,
  Sparkles,
  Star,
  Ticket,
  TrainFront,
  TriangleAlert,
  User,
  Users,
  Utensils,
  Car,
  Wine,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_CITY,
  QUICK_CITIES,
  detectLocation,
  getCity,
  startPlaceholder,
} from "../../lib/pathzu";
import { GLASS_CARD, ShareActions, StepCard } from "../components/RouteParts";

const CITY_PILLS: { city: string; name: string; Icon: LucideIcon }[] = [
  { city: "Chicago, IL", name: "Chicago", Icon: Wind },
  { city: "New York, NY", name: "New York", Icon: Apple },
  { city: "Austin, TX", name: "Austin", Icon: Guitar },
  { city: "Miami, FL", name: "Miami", Icon: TreePalm },
  { city: "Los Angeles, CA", name: "Los Angeles", Icon: Clapperboard },
];

const PILL_BASE =
  "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all whitespace-nowrap";
const PILL_ACTIVE = "bg-white text-black border-white font-bold";
const PILL_INACTIVE =
  "bg-transparent text-white border-white/20 font-medium hover:border-white/50";

// 30-minute time pills ("6:00 PM", "6:30 PM", ...) between two hours (24h, inclusive)
const buildTimeSlots = (fromHour: number, toHour: number) => {
  const slots: string[] = [];
  for (let h = fromHour; h <= toHour; h++) {
    for (const m of [0, 30]) {
      if (h === toHour && m > 0) continue;
      slots.push(
        `${h % 12 || 12}:${m === 0 ? "00" : "30"} ${h >= 12 ? "PM" : "AM"}`,
      );
    }
  }
  return slots;
};

const TIME_SLOTS: Record<string, string[]> = {
  "Later Tonight": buildTimeSlots(17, 23),
  Tomorrow: buildTimeSlots(8, 22),
};
const DEFAULT_START: Record<string, string> = {
  "Later Tonight": "7:00 PM",
  Tomorrow: "10:00 AM",
};

const LIVE_EVENT_MOOD = "\u{1F3AB} Live Event";

// `value` is what we send to the backend/Gemini (unchanged); `label` is what the user sees.
type PillOption = { value: string; label: string; Icon: LucideIcon };

const TRANSIT_OPTIONS: PillOption[] = [
  { value: "\u{1F6B6} Walk", label: "Walk", Icon: Footprints },
  { value: "\u{1F686} Public Transit", label: "Transit", Icon: TrainFront },
  { value: "\u{1F697} Drive/Uber", label: "Drive/Uber", Icon: Car },
];

const PARTY_OPTIONS: PillOption[] = [
  { value: "Solo", label: "Solo", Icon: User },
  { value: "Date", label: "Date", Icon: Heart },
  { value: "Group", label: "Group", Icon: Users },
];

const MOOD_OPTIONS: PillOption[] = [
  {
    value: "\u{1F6B6} Walking Route",
    label: "Walking Route",
    Icon: Footprints,
  },
  { value: "\u{1F377} Chill Date", label: "Chill Date", Icon: Wine },
  { value: "\u{1F9D8} Reset Mind", label: "Reset Mind", Icon: Brain },
  { value: "\u2615 Coffee Run", label: "Coffee Run", Icon: Coffee },
  { value: "\u{1F415} Walk Dog", label: "Walk Dog", Icon: Dog },
  { value: "\u{1F306} Explore City", label: "Explore City", Icon: Building2 },
  {
    value: "\u{1F5E3}\uFE0F Deep Talks",
    label: "Deep Talks",
    Icon: MessageCircle,
  },
  { value: "\u{1F3C3} Running Route", label: "Running Route", Icon: Activity },
  { value: "\u{1FAA9} Turn Up", label: "Turn Up", Icon: PartyPopper },
  { value: "\u{1F4F8} Aesthetic", label: "Aesthetic", Icon: Camera },
  { value: "\u{1F354} Food Coma", label: "Food Coma", Icon: Utensils },
  { value: LIVE_EVENT_MOOD, label: "Live Event", Icon: Ticket },
];

export default function Home() {
  const [itinerary, setItinerary] = useState<any>(null);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  const [mounted, setMounted] = useState(false);

  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false); // 🚨 NEW: Tracks if they paid!
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSwapSpot = async (index: number, currentSpot: any) => {
    setSwappingIndex(index);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/swap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vibe: itinerary.title || "custom vibe",
            spot_to_replace: currentSpot,
            current_route: itinerary,
            // Mode the route was built for, so a swap keeps it walkable.
            transit: itinerary.transit || transit,
          }),
        },
      );
      const newSpot = await response.json();
      const updatedItinerary = { ...itinerary, plan: [...itinerary.plan] };
      updatedItinerary.plan[index] = newSpot;
      setItinerary(updatedItinerary);
      if (itinerary.id) {
        const { error } = await supabase
          .from("itineraries")
          .update({ full_json: updatedItinerary })
          .eq("id", itinerary.id);

        if (error) {
          console.error("Failed to save swap to database:", error);
        }
      }
    } catch (error) {
      console.error("Failed to swap spot:", error);

      alert("The AI had a hiccup trying to find a new spot. Try again!");
    } finally {
      setSwappingIndex(null);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Helper function to check the database
    const checkProStatus = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", userId)
        .single();
      if (data && data.is_pro) {
        setIsPro(true);
      }
    };

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) checkProStatus(session.user.id);
    });

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkProStatus(session.user.id);
      } else {
        setIsPro(false);
      }
    });

    // Handle Stripe Redirects
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
      alert("Payment Successful! Welcome to Pathzu Pro!");
      window.history.replaceState(null, "", window.location.pathname);
      setIsPro(true); // Instantly upgrade them in the UI!
    }
    if (urlParams.get("payment") === "cancelled") {
      window.history.replaceState(null, "", window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  // --- APP STATE ---
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState(false);
  const [findingGPS, setFindingGPS] = useState(false);
  const [timing, setTiming] = useState("Right Now");
  // Exact start time (e.g. "7:30 PM") for Later Tonight / Tomorrow
  const [startTime, setStartTime] = useState("7:00 PM");

  const pickTiming = (opt: string) => {
    setTiming(opt);
    if (DEFAULT_START[opt]) setStartTime(DEFAULT_START[opt]);
  };
  const [transit, setTransit] = useState(TRANSIT_OPTIONS[0].value);
  const [distance, setDistance] = useState("Neighborhood");
  const [party, setParty] = useState("Solo");
  const [budget, setBudget] = useState("$$");
  const [mood, setMood] = useState("");
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [isPaywall, setIsPaywall] = useState(false);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [detectingCity, setDetectingCity] = useState(false);
  const [cityDetectFailed, setCityDetectFailed] = useState(false);
  // Once the user picks a city, auto-detection must never overwrite it.
  const cityPickedManually = useRef(false);

  const pickCity = (c: string) => {
    cityPickedManually.current = true;
    setCityDetectFailed(false);
    setNearMeActive(false);
    setCity(c);
  };

  const pickQuickCity = (c: string) => {
    setCustomOpen(false);
    pickCity(c);
  };

  // Typing in the "Other" box sets any city nationwide (e.g. "Nashville, TN").
  const handleCustomCity = (value: string) => {
    setCustomCity(value);
    if (value.trim()) pickCity(value.trim());
  };

  // A city that isn't a pill and wasn't detected must have been typed in.
  const customActive = !nearMeActive && !QUICK_CITIES.includes(city);

  // "Near Me" button: explicit request, so it always applies the result and
  // pre-fills the starting point (neighborhood, or exact coordinates).
  const handleNearMe = async () => {
    setDetectingCity(true);
    setCityDetectFailed(false);
    const found = await detectLocation();
    if (found) {
      cityPickedManually.current = true;
      setCustomOpen(false);
      setNearMeActive(true);
      setCity(found.city);
      if (found.start) {
        setLocation(found.start);
        setLocationError(false);
      }
    } else {
      setCityDetectFailed(true);
    }
    setDetectingCity(false);
  };

  // Silent auto-detect on first load (city only), unless the user already chose one.
  useEffect(() => {
    let cancelled = false;
    detectLocation().then((found) => {
      if (found && !cancelled && !cityPickedManually.current) {
        setCity(found.city);
        setNearMeActive(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  // Fetch live Ticketmaster events for the selected city
  useEffect(() => {
    let cancelled = false;
    const fetchEvents = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/events?city=${encodeURIComponent(city.trim() || DEFAULT_CITY)}`,
        );
        const data = await res.json();
        if (!cancelled) setLiveEvents(data.events || []);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    // Debounce so typing a custom city doesn't fire a request per keystroke
    const timer = setTimeout(fetchEvents, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city]);

  // 🚨 NEW: Loading state for the Stripe button
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // --- ACTIONS ---

  // 🚨 NEW: The Stripe Checkout Trigger
  const handleGoPro = async () => {
    // 1. Make sure they are logged in!
    if (!user) {
      alert("Please sign in first!");
      return;
    }

    setCheckoutLoading(true);
    try {
      // 2. The exact URL, Port, Headers, and User ID payload
      // 👇 CHANGED THIS LINE 👇
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        },
      );

      const data = await response.json();

      if (data.checkout_url) {
        // 3. Blast off to Stripe!
        window.location.href = data.checkout_url;
      } else {
        // 4. Catch exactly what Python is mad about if it fails
        const errorMessage =
          data.error ||
          (data.detail && JSON.stringify(data.detail)) ||
          "Unknown Error";
        alert("Failed to generate checkout: " + errorMessage);
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Could not connect to the payment server.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setAuthLoading(true);
  //   setAuthMsg("");
  //   const { error } = await supabase.auth.signInWithOtp({ email });
  //   if (error) setAuthMsg(error.message);
  //   else {
  //     setAuthMsg("Magic link sent! Check your email.");
  //     setEmail("");
  //   }
  //   setAuthLoading(false);
  // };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This forces Supabase to return to localhost in dev, and pathzu.com in prod
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) setAuthMsg(error.message);
    else {
      setAuthMsg("Magic link sent! Check your email.");
      setEmail("");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLoginModal(false);
  };

  const grabExactLocation = () => {
    setFindingGPS(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(
            `${position.coords.latitude}, ${position.coords.longitude}`,
          );
          setLocationError(false);
          setFindingGPS(false);
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Couldn't grab exact location.");
          setFindingGPS(false);
        },
      );
    } else {
      alert("GPS not supported.");
      setFindingGPS(false);
    }
  };

  // --- GENERATE ROUTE ---
  const generateItinerary = async () => {
    // A starting point is mandatory (the Enter key also routes through here).
    if (!location.trim()) {
      setLocationError(true);
      return;
    }
    if (!mood && !vibe) {
      setErrorMsg("Pick a mood or add a few details first.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setIsPaywall(false);
    setItinerary(null);
    setIsSaved(false);

    // 🧠 Your custom location formatting, now relative to the selected city
    const selectedCity = city.trim() || DEFAULT_CITY;
    const cityName = selectedCity.split(",")[0].trim().toLowerCase();
    let formattedLocation = location.trim() || selectedCity;
    if (
      !formattedLocation.includes(",") &&
      !formattedLocation.toLowerCase().includes(cityName)
    ) {
      formattedLocation = `${formattedLocation}, ${selectedCity}`;
    }

    const payload = {
      location: formattedLocation, // 🚨 Using your upgraded location
      city: selectedCity,
      timing,
      start_time: timing === "Right Now" ? null : startTime,
      transit,
      distance,
      party,
      budget,
      mood,
      prompt: vibe,
      time_context: new Date().toLocaleTimeString(),
      user_id: user?.id || null,
    };

    try {
      // 👇 CHANGED THIS LINE 👇
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/route`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();

      const parsedData = JSON.parse(data.reply);
      if (parsedData.error) {
        if (parsedData.error === "PAYWALL_HIT") {
          setIsPaywall(true);
          setErrorMsg(parsedData.message);
        } else {
          setErrorMsg(parsedData.error);
        }
      }

      // 👇 REPLACE THIS ENTIRE ELSE BLOCK 👇
      else {
        // 🛡️ THE SAFETY NET: Find the ID no matter what name Python used!
        const finalId =
          data.id || data.route_id || parsedData.id || parsedData.share_id;

        if (finalId) {
          parsedData.id = finalId; // Force it into .id so the button can see it
          console.log("✅ ID Found:", finalId);
        } else {
          console.error("❌ No ID found in backend response:", data);
        }

        parsedData.city = parsedData.city || selectedCity;
        parsedData.transit = parsedData.transit || transit;
        setItinerary(parsedData);
      }
    } catch (error) {
      setErrorMsg("Failed to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]"></div>;
  const handleSaveToVault = async () => {
    if (!itinerary?.id) return;

    const { error } = await supabase
      .from("itineraries")
      .update({ is_saved_to_vault: true })
      .eq("id", itinerary.id);

    if (error) {
      console.error("Failed to save to vault:", error);
      alert("Could not save to Vault. Try again!");
    } else {
      setIsSaved(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30 relative">
      {/* 🚨 AUTH HEADER WITH GO PRO BUTTON 🚨 */}
      <div className="w-full max-w-5xl flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">
              Hey, {user.email?.split("@")[0]}
            </span>

            {/* 🚨 THE UPGRADED PAYWALL LOGIC 🚨 */}

            {/* 🚨 THE UPGRADED PAYWALL LOGIC 🚨 */}
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black rounded-full shadow-[0_0_20px_rgba(251,191,36,0.4)] tracking-wide cursor-default">
                <Crown className="w-3.5 h-3.5" /> PRO MEMBER
              </span>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Monthly Subscription Button */}
                <button
                  onClick={() =>
                    (window.location.href = `https://buy.stripe.com/00w6oIdoO9bD0Wmbzw4Ni01?client_reference_id=${user?.id}`)
                  }
                  className="text-xs font-bold px-4 py-2 bg-transparent hover:bg-neutral-800 text-white border border-neutral-600 rounded-full transition-all duration-300"
                >
                  Local Pass ($4.99/mo)
                </button>

                {/* 10-Day Tourist Pass Button */}
                <button
                  onClick={() =>
                    (window.location.href = `https://buy.stripe.com/4gMcN63Oe1JbgVk0US4Ni02?client_reference_id=${user?.id}`)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                >
                  <Plane className="w-3.5 h-3.5" /> 10-Day Tourist Pass ($9.99)
                </button>
              </div>
            )}

            {/* 👇 THE NEW VAULT LINK 👇 */}
            <Link
              href="/vault"
              className="text-xs font-bold px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors border border-neutral-700 inline-flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" /> My Vault
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-bold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full transition-colors border border-neutral-800"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="text-sm font-bold px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded-full transition-colors shadow-lg"
          >
            Sign In
          </button>
        )}
      </div>
      {/* LOGIN MODAL */}
      {!user && showLoginModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-[#111111] border border-neutral-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl font-black mb-2 tracking-tight">
              Welcome to Pathzu.
            </h2>
            <p className="text-neutral-400 text-sm mb-6">
              Sign in to save your favorite routes and unlock premium features.
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                required
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500/50 text-white"
              />
              <button
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold rounded-xl disabled:opacity-50 text-white"
              >
                {authLoading ? "Sending Link..." : "Send Magic Link"}
              </button>
            </form>
            {authMsg && (
              <p className="mt-4 text-center text-sm text-pink-400 font-medium">
                {authMsg}
              </p>
            )}
          </div>
        </div>
      )}
      {/* --- REST OF THE UI --- */}
      <div className="w-full max-w-3xl mt-4 flex flex-col items-center">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header-mark.svg"
              alt="Pathzu Logo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Pathzu.
            </h1>
          </div>
          <p className="text-neutral-400 text-lg md:text-xl font-medium mb-8 max-w-xl mx-auto">
            Smart paths, for real life.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-900/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl mb-8 font-medium text-center text-sm flex items-center justify-center gap-2">
            {isPaywall ? (
              <Lock className="w-4 h-4 shrink-0" />
            ) : (
              <TriangleAlert className="w-4 h-4 shrink-0" />
            )}
            {errorMsg}
          </div>
        )}

        {/* 🔥 TONIGHT IN CHICAGO DASHBOARD */}
        {liveEvents.length > 0 && (
          <div className="w-full bg-[#111111] border border-orange-500/30 rounded-[2rem] p-6 sm:p-8 shadow-[0_0_30px_rgba(249,115,22,0.15)] mb-8 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500"></div>
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" /> Trending in{" "}
              {city.split(",")[0].trim() || "your city"}
            </h3>
            {/* 🚨 NEW: Horizontal Scroll Container */}

            {/* 🚨 UPGRADED: Premium Horizontal Scroll */}
            <div className="flex overflow-x-auto gap-4 pb-6 pt-2 snap-x snap-mandatory no-scrollbar px-1">
              {/* 👻 Ghost box successfully deleted from right here! */}

              {liveEvents.map((event, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMood(LIVE_EVENT_MOOD);
                    setVibe(
                      `I'm attending ${event.name} at ${event.venue}. The event starts at ${event.time}. Ignore my current local time. Build a pre-game and post-game itinerary anchored perfectly around this event's start time.`,
                    );
                  }}
                  className="snap-center text-left shrink-0"
                >
                  <div className="flex flex-col justify-center h-24 bg-[#121212] rounded-xl border border-white/10 p-4 cursor-pointer hover:border-white/30 transition-colors shrink-0 w-72">
                    <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">
                      {event.time}
                    </p>
                    <h3 className="text-white font-bold text-sm truncate">
                      {event.name}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1 truncate">
                      {event.venue}
                    </p>
                  </div>
                </button>
              ))}

              {/* Optional: Add a 'Swipe for more' hint at the end */}
              <div className="min-w-[40px] flex items-center justify-center text-neutral-600 shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="w-full bg-[#111111] border border-neutral-800/80 rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-12">
          {/* City selector */}
          <div className="mb-8 pb-8 border-b border-neutral-800/50">
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
              Which city?
            </label>
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
              <button
                onClick={handleNearMe}
                disabled={detectingCity}
                className={`${PILL_BASE} disabled:opacity-70 ${
                  nearMeActive || detectingCity ? PILL_ACTIVE : PILL_INACTIVE
                }`}
              >
                {detectingCity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
                {detectingCity
                  ? "Locating..."
                  : nearMeActive
                    ? `Near Me · ${city.split(",")[0].trim()}`
                    : "Near Me"}
              </button>

              {CITY_PILLS.map(({ city: c, name, Icon }) => (
                <button
                  key={c}
                  onClick={() => pickQuickCity(c)}
                  className={`${PILL_BASE} ${
                    city === c && !nearMeActive ? PILL_ACTIVE : PILL_INACTIVE
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {name}
                </button>
              ))}

              {/* Search: matching pill that turns into an inline input */}
              {customOpen ? (
                <div
                  className={`${PILL_BASE} ${customActive ? "border-white" : "border-white/20"} focus-within:border-white`}
                >
                  <Search className="w-4 h-4 text-white shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={customCity}
                    onChange={(e) => handleCustomCity(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && e.currentTarget.blur()
                    }
                    placeholder="Search City... (e.g. Nashville, TN)"
                    className="bg-transparent text-sm w-56 focus:outline-none placeholder-neutral-500 text-white"
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (customCity.trim()) pickCity(customCity.trim());
                    setCustomOpen(true);
                  }}
                  className={`${PILL_BASE} ${customActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                >
                  <Search className="w-4 h-4" />
                  {customActive ? city.split(",")[0].trim() : "Search"}
                </button>
              )}
            </div>
            {cityDetectFailed && (
              <p className="text-xs text-neutral-500">
                Couldn&apos;t detect your location automatically. Pick a city
                above and enter a starting point below.
              </p>
            )}
          </div>

          <div className="mb-8 pb-8 border-b border-neutral-800/50">
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
              Where are we starting?{" "}
              <span className="text-pink-500" title="Required">
                *
              </span>
            </label>
            <div
              className={`flex bg-[#1a1a1a] border rounded-xl p-1.5 transition-all ${
                locationError
                  ? "border-red-500"
                  : "border-neutral-800 focus-within:border-pink-500/50"
              }`}
            >
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setLocationError(false);
                }}
                required
                placeholder={startPlaceholder(city)}
                className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
              />
              <button
                onClick={grabExactLocation}
                disabled={findingGPS}
                className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
              >
                {findingGPS ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {findingGPS ? "Locating..." : "GPS"}
              </button>
            </div>
            {locationError && (
              <p className="text-red-500 text-xs mt-2" role="alert">
                Please enter a starting location or tap GPS.
              </p>
            )}
          </div>
          {/* Grid Settings */}
          {/* 🚨 ROW 1: THE LOGISTICS (3 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                When?
              </label>
              <div className="flex flex-col gap-2">
                {["Right Now", "Later Tonight", "Tomorrow"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => pickTiming(opt)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition-all ${timing === opt ? "bg-purple-900/30 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {opt}
                  </button>
                ))}
                {TIME_SLOTS[timing] && (
                  <div className="flex overflow-x-auto whitespace-nowrap w-full no-scrollbar pb-2 gap-2 pr-8">
                    {TIME_SLOTS[timing].map((t) => (
                      <button
                        key={t}
                        onClick={() => setStartTime(t)}
                        className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all ${
                          startTime === t
                            ? "bg-white/10 border-white text-white"
                            : "bg-white/[0.04] border-white/10 text-neutral-500 hover:text-neutral-300 hover:border-white/25"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                Transit?
              </label>
              <div className="flex flex-col gap-2">
                {TRANSIT_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTransit(value)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition-all inline-flex items-center gap-2 ${transit === value ? "bg-blue-900/30 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                Radius?
              </label>
              <div className="flex flex-col gap-2">
                {["Neighborhood", "< 3 Miles", "Anywhere"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDistance(opt)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition-all ${distance === opt ? "bg-pink-900/30 text-pink-400 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* 🚨 ROW 2: THE VIBE DETAILS (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                Who's going?
              </label>
              <div className="flex gap-2">
                {PARTY_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setParty(value)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border inline-flex items-center justify-center gap-2 ${party === value ? "bg-purple-900/30 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                Budget?
              </label>
              <div className="flex gap-3">
                {["$", "$$", "$$$"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all border ${budget === b ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Goals & Prompts */}
          <div>
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
              What&apos;s the goal today?
            </label>
            <div className="flex flex-wrap gap-2 mb-5">
              {MOOD_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setMood(mood === value ? "" : value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border inline-flex items-center gap-2 ${
                    mood === value
                      ? "bg-white text-black border-white"
                      : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Add specific details (e.g. No alcohol, vegan food, skyline view...)"
                className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
                onKeyDown={(e) => e.key === "Enter" && generateItinerary()}
              />
              <button
                onClick={generateItinerary}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
              >
                {loading ? "Routing..." : "Route It"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* RESULTS AREA */}

      {/* 🚀 THE BRAND NEW DYNAMIC LOADER 🚀 */}
      {loading && (
        <div className="w-full mt-8 mb-24 flex justify-center">
          <DynamicLoader city={city} />
        </div>
      )}

      {itinerary && itinerary.plan && !loading && (
        <div className="w-full animate-fade-in flex flex-col items-center pb-24">
          {/* Top Section: Title, Pills, Weather */}
          {/* 🚨 ALIGNMENT FIX: Added max-w-2xl and mx-auto to the main wrapper */}
          <div className="text-center mb-10 w-full max-w-2xl mx-auto border-b border-neutral-800 pb-8 flex flex-col items-center">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              {itinerary.title}
            </h2>

            {/* 🚨 WRAP FIX: Added flex-wrap just in case the AI writes a long sentence */}
            <div className="flex flex-wrap justify-center gap-3 mb-6 w-full">
              <span className="px-4 py-1.5 bg-[#111111] border border-neutral-800 rounded-full text-xs font-bold uppercase tracking-wide text-neutral-300">
                {party} • {budget}
              </span>
              <span className="px-4 py-1.5 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50 uppercase tracking-wide">
                {itinerary.vibe}
              </span>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 p-5 rounded-2xl text-left w-full mx-auto">
              <p className="text-white font-bold mb-2 text-sm flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-400 shrink-0" /> Live
                Weather: {itinerary.weather}
              </p>
              <p className="text-indigo-300 text-sm flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-indigo-400">Concierge Tip:</strong>{" "}
                  {itinerary.outfit_tip}
                </span>
              </p>
            </div>

            {itinerary.id && (
              <ShareActions itinerary={itinerary} routeId={itinerary.id}>
                {/* Save to Vault (logged-in users only) */}
                {user && (
                  <button
                    onClick={handleSaveToVault}
                    disabled={isSaved}
                    className={`px-5 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 active:scale-95 ${
                      isSaved
                        ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 cursor-default"
                        : `${GLASS_CARD} text-white`
                    }`}
                  >
                    {isSaved ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    {isSaved ? "Saved to Vault" : "Save to Vault"}
                  </button>
                )}
              </ShareActions>
            )}
          </div>

          {/* ALIGNMENT FIX 2: Make the cards container the exact same width as the weather card */}
          <div className="space-y-6 w-full max-w-2xl mx-auto">
            {itinerary.plan.map((step: any, index: number) => (
              <StepCard
                key={index}
                step={step}
                city={getCity(itinerary)}
                onSwap={() => handleSwapSpot(index, step)}
                swapping={swappingIndex === index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DynamicLoader({
  isSwapping = false,
  city = DEFAULT_CITY,
}: {
  isSwapping?: boolean;
  city?: string;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  const generateMessages = [
    `Consulting local ${city.split(",")[0].trim() || "city"} experts...`,
    "Checking live Ticketmaster events...",
    "Mapping the best transit routes...",
    "Vibe check in progress...",
    "Finalizing your itinerary...",
  ];

  const swapMessages = [
    "Searching the neighborhood...",
    "Finding a better vibe...",
    "Dodging the tourist traps...",
    "Securing a new spot...",
  ];

  const activeMessages = isSwapping ? swapMessages : generateMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % activeMessages.length);
    }, 2000); // Changes message every 2 seconds

    return () => clearInterval(interval);
  }, [activeMessages.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
      <p className="text-pink-400 font-bold tracking-widest uppercase text-sm animate-pulse text-center">
        {activeMessages[messageIndex]}
      </p>
    </div>
  );
}
