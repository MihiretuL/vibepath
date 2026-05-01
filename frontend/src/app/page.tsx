"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { GiMagicHat } from "react-icons/gi"; // magic-related icon
import { FaChess } from "react-icons/fa"; // any fun icon
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false); // 🚨 NEW: Tracks if they paid!
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch Live Chicago Events
    const fetchEvents = async () => {
      try {
        // 👇 CHANGED THIS LINE 👇
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/events`,
        );
        const data = await res.json();
        if (data.events) setLiveEvents(data.events);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    fetchEvents();

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
      alert("🎉 Payment Successful! Welcome to Pathzu Pro!");
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
  const [findingGPS, setFindingGPS] = useState(false);
  const [timing, setTiming] = useState("Right Now");
  const [transit, setTransit] = useState("🚶 Walk");
  const [distance, setDistance] = useState("Neighborhood");
  const [party, setParty] = useState("Solo");
  const [budget, setBudget] = useState("$$");
  const [mood, setMood] = useState("");
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [routeId, setRouteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [fetchingEvents, setFetchingEvents] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setAuthMsg(`❌ ${error.message}`);
    else {
      setAuthMsg("✨ Magic link sent! Check your email.");
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
    if (!mood && !vibe) return;
    setLoading(true);
    setErrorMsg("");
    setItinerary(null);

    // 🧠 Your custom location formatting!
    let formattedLocation = location.trim() || "Chicago, IL";
    if (
      !formattedLocation.includes(",") &&
      !formattedLocation.toLowerCase().includes("chicago")
    ) {
      formattedLocation = `${formattedLocation}, Chicago, IL`;
    }

    const payload = {
      location: formattedLocation, // 🚨 Using your upgraded location
      timing,
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
          setErrorMsg("🔒 " + parsedData.message);
        } else {
          setErrorMsg(`🚨 ${parsedData.error}`);
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

        setItinerary(parsedData);
      }
    } catch (error) {
      setErrorMsg("Failed to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!routeId) return;
    navigator.clipboard.writeText(`${window.location.origin}/route/${routeId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openMaps = (placeName: string) =>
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ", " + (location || "Chicago, IL"))}`,
      "_blank",
    );
  const openUber = (placeName: string) =>
    window.open(
      `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(placeName + ", " + (location || "Chicago, IL"))}`,
      "_blank",
    );

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]"></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30 relative">
      {/* 🚨 AUTH HEADER WITH GO PRO BUTTON 🚨 */}
      <div className="w-full max-w-5xl flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">
              Hey, {user.email?.split("@")[0]} 👋
            </span>

            {/* 🚨 THE UPGRADED PAYWALL LOGIC 🚨 */}
            {isPro ? (
              <span className="text-xs font-black px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black rounded-full shadow-[0_0_20px_rgba(251,191,36,0.4)] tracking-wide cursor-default">
                👑 PRO MEMBER
              </span>
            ) : (
              <button
                onClick={handleGoPro}
                disabled={checkoutLoading}
                className="text-xs font-bold px-5 py-2 bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-amber-400 hover:to-orange-500 text-white hover:text-black border border-neutral-600 hover:border-transparent rounded-full transition-all duration-300 disabled:opacity-50"
              >
                {checkoutLoading ? "Loading..." : "✨ Go Pro"}
              </button>
            )}

            {/* 👇 THE NEW VAULT LINK 👇 */}
            <Link
              href="/vault"
              className="text-xs font-bold px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors border border-neutral-700"
            >
              🗄️ My Vault
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
                {authLoading ? "Sending Link..." : "Send Magic Link ✨"}
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
          <h1 className="text-5xl sm:text-6xl font-black mb-4 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Pathzu.
          </h1>
          <p className="text-neutral-400 text-lg md:text-xl font-medium mb-8 max-w-xl mx-auto">
            Smart paths, for real life.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-900/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl mb-8 font-medium text-center text-sm">
            🚨 {errorMsg}
          </div>
        )}

        {/* 🔥 TONIGHT IN CHICAGO DASHBOARD */}
        {liveEvents.length > 0 && (
          <div className="w-full bg-[#111111] border border-orange-500/30 rounded-[2rem] p-6 sm:p-8 shadow-[0_0_30px_rgba(249,115,22,0.15)] mb-8 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500"></div>
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span> Trending in Chicago
            </h3>
            {/* 🚨 NEW: Horizontal Scroll Container */}

            {/* 🚨 UPGRADED: Premium Horizontal Scroll */}
            <div className="flex overflow-x-auto gap-4 pb-6 pt-2 snap-x snap-mandatory no-scrollbar px-1">
              {/* 👻 Ghost box successfully deleted from right here! */}

              {liveEvents.map((event, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMood("🎫 Live Event");
                    setVibe(
                      `I'm attending ${event.name} at ${event.venue}. The event starts at ${event.time}. Ignore my current local time. Build a pre-game and post-game itinerary anchored perfectly around this event's start time.`,
                    );
                  }}
                  // 🚨 NEW: Wider cards (300px), better padding, and snap-center
                  className="min-w-[300px] max-w-[300px] snap-center text-left p-5 bg-[#111111] border border-neutral-800 hover:border-orange-500/50 hover:bg-orange-500/10 rounded-2xl transition-all group flex flex-col gap-3 shrink-0 shadow-lg"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">
                      🎟️ {event.time}
                    </span>
                  </div>

                  {/* line-clamp-2 allows exactly two lines of text before adding '...' */}
                  <h3
                    className="text-lg font-bold text-white leading-tight line-clamp-2"
                    title={event.name}
                  >
                    {event.name}
                  </h3>

                  <p className="text-neutral-400 text-xs font-medium truncate flex items-center gap-1 mt-auto">
                    📍 {event.venue}
                  </p>
                </button>
              ))}

              {/* Optional: Add a 'Swipe for more' hint at the end */}
              <div className="min-w-[40px] flex items-center justify-center text-neutral-600 shrink-0">
                ➡️
              </div>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="w-full bg-[#111111] border border-neutral-800/80 rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-12">
          <div className="mb-8 pb-8 border-b border-neutral-800/50">
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
              Where are we starting?
            </label>
            <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Neighborhood or cross street (e.g. Clark & Belmont)..."
                className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
              />
              <button
                onClick={grabExactLocation}
                disabled={findingGPS}
                className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
              >
                {findingGPS ? "⏳ Locating..." : "📍 GPS"}
              </button>
            </div>
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
                    onClick={() => setTiming(opt)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition-all ${timing === opt ? "bg-purple-900/30 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">
                Transit?
              </label>
              <div className="flex flex-col gap-2">
                {["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTransit(opt)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition-all ${transit === opt ? "bg-blue-900/30 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {opt}
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
                {["Solo", "Date", "Group"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setParty(p)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${party === p ? "bg-purple-900/30 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"}`}
                  >
                    {p === "Solo"
                      ? "👤 Solo"
                      : p === "Date"
                        ? "👩‍❤️‍👨 Date"
                        : "👯 Group"}
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
              {[
                "🚶 Walking Route",
                "🍷 Chill Date",
                "🧘 Reset Mind",
                "☕ Coffee Run",
                "🐕 Walk Dog",

                "🌆 Explore City",
                "🗣️ Deep Talks",
                "🏃 Running Route",
                "🪩 Turn Up",
                "📸 Aesthetic",
                "🍔 Food Coma",
                "🎫 Live Event",
              ].map((pin) => (
                <button
                  key={pin}
                  onClick={() => setMood(mood === pin ? "" : pin)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    mood === pin
                      ? "bg-white text-black border-white"
                      : "bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  {pin}
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
                disabled={loading || (!mood && !vibe)}
                className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
              >
                {loading ? "Routing..." : "Route It"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* RESULTS AREA */}
      {/* 🚨 ITINERARY DISPLAY */}
      {itinerary && itinerary.plan && (
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

            <div className="bg-[#111111] border border-indigo-500/30 p-5 rounded-2xl text-left w-full shadow-[0_0_30px_rgba(99,102,241,0.05)] mx-auto">
              <p className="text-white font-bold mb-2 text-sm flex items-center gap-2">
                ☁️ Live Weather: {itinerary.weather}
              </p>
              <p className="text-indigo-300 text-sm">
                <strong className="text-indigo-400">Concierge Tip:</strong>{" "}
                {itinerary.outfit_tip}
              </p>
            </div>

            {itinerary.id && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    // 1. Copy the link quietly in the background
                    navigator.clipboard.writeText(
                      `https://pathzu.com/route/${itinerary.id}`,
                    );

                    // 2. Show the clean, user-friendly popup!
                    alert("Link copied! Text it to your friends.");
                  }}
                  className="px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-full text-sm font-bold transition-all shadow-[0_5px_20px_rgba(255,255,255,0.1)] flex items-center gap-2 mx-auto active:scale-95"
                >
                  🔗 Share this Path
                </button>
              </div>
            )}
          </div>

          {/* ALIGNMENT FIX 2: Make the cards container the exact same width as the weather card */}
          <div className="space-y-6 w-full max-w-2xl mx-auto">
            {itinerary.plan.map((step: any, index: number) => (
              <div
                key={index}
                className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group"
              >
                {/* The Vertical Accent Line */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>

                {/* PADDING FIX: Added pl-6 here to push text safely away from the line */}
                <div className="flex flex-col py-1 pl-6">
                  <div className="mb-4">
                    <span className="bg-black border border-neutral-800 text-pink-400 font-bold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full inline-block">
                      {step.time || "Time TBD"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {step.title}
                  </h3>

                  {/* DUPLICATE FIX: Only ONE location tag here now */}
                  <p className="text-pink-500 text-xs font-bold mb-3 tracking-wide">
                    📍 {step.place}
                  </p>

                  {/* Price Tag */}
                  {step.cost_estimate && (
                    <div className="mb-4">
                      <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase bg-emerald-900/20 px-3 py-1.5 rounded-md border border-emerald-800/50">
                        💵 {step.cost_estimate}
                      </span>
                    </div>
                  )}

                  <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                    {step.description}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-auto">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.place + ", Chicago, IL")}`,
                          "_blank",
                        )
                      }
                      className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md"
                    >
                      🗺️ Google Maps
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(step.place + ", Chicago, IL")}`,
                          "_blank",
                        )
                      }
                      className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md"
                    >
                      🚗 Request Uber
                    </button>
                    {/* 👇 THE BRAND NEW SWAP BUTTON 👇 */}
                    <button
                      onClick={() => handleSwapSpot(index, step)}
                      disabled={swappingIndex === index}
                      className="bg-neutral-900 border border-neutral-700 text-neutral-300 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {swappingIndex === index ? (
                        <span className="animate-spin text-pink-500">⏳</span>
                      ) : (
                        "🔄 Swap this spot"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
