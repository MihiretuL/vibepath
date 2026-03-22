"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; 
import { GiMagicHat } from "react-icons/gi"; // magic-related icon
import { FaChess } from "react-icons/fa";   // any fun icon

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false); // 🚨 NEW: Tracks if they paid!
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch Live Chicago Events
    const fetchEvents = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/events");
        const data = await res.json();
        if (data.events) setLiveEvents(data.events);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    fetchEvents();
    
    // Helper function to check the database
    const checkProStatus = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkProStatus(session.user.id);
      } else {
        setIsPro(false);
      }
    });

    // Handle Stripe Redirects
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      alert("🎉 Payment Successful! Welcome to VibePath Pro!");
      window.history.replaceState(null, '', window.location.pathname);
      setIsPro(true); // Instantly upgrade them in the UI!
    }
    if (urlParams.get('payment') === 'cancelled') {
      window.history.replaceState(null, '', window.location.pathname);
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
      const response = await fetch("http://localhost:8000/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }), 
      });
      
      const data = await response.json();
      
      if (data.checkout_url) {
        // 3. Blast off to Stripe!
        window.location.href = data.checkout_url;
      } else {
        // 4. Catch exactly what Python is mad about if it fails
        const errorMessage = data.error || (data.detail && JSON.stringify(data.detail)) || "Unknown Error";
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
    setAuthLoading(true); setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setAuthMsg(`❌ ${error.message}`);
    else { setAuthMsg("✨ Magic link sent! Check your email."); setEmail(""); }
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
        (position) => { setLocation(`${position.coords.latitude}, ${position.coords.longitude}`); setFindingGPS(false); },
        (error) => { console.error("GPS Error:", error); alert("Couldn't grab exact location."); setFindingGPS(false); }
      );
    } else { alert("GPS not supported."); setFindingGPS(false); }
  };

  const generateItinerary = async () => {
    if (!mood && !vibe) return;
    setLoading(true); setItinerary(null); setRouteId(null); setErrorMsg("");
    const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

    let formattedLocation = location.trim() || "Chicago, IL";
    if (!formattedLocation.includes(",") && !formattedLocation.toLowerCase().includes("chicago")) {
      formattedLocation = `${formattedLocation}, Chicago, IL`;
    }

    const payload = {
      timing, transit, distance, party, budget, mood, prompt: vibe, time_context: currentTime, location: formattedLocation,
      user_id: user?.id || null 
    };

    try {
      const response = await fetch("http://localhost:8000/api/route", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Server rejected request: ${response.status}`);
      const data = await response.json();
      const parsedData = JSON.parse(data.reply);
      if (parsedData.error) setErrorMsg(`Backend Error: ${parsedData.error}`);
      else { setItinerary(parsedData); if (data.route_id) setRouteId(data.route_id); }
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to reach server.");
    } finally { setLoading(false); }
  };

  const handleShare = () => {
    if (!routeId) return;
    navigator.clipboard.writeText(`${window.location.origin}/route/${routeId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const openMaps = (placeName: string) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ", " + (location || "Chicago, IL"))}`, "_blank");
  const openUber = (placeName: string) => window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(placeName + ", " + (location || "Chicago, IL"))}`, "_blank");

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]"></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30 relative">
      
      {/* 🚨 AUTH HEADER WITH GO PRO BUTTON 🚨 */}
      <div className="w-full max-w-5xl flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">Hey, {user.email?.split('@')[0]} 👋</span>
            
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

            <button onClick={handleLogout} className="text-xs font-bold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full transition-colors border border-neutral-800">Sign Out</button>
          </div>
        ) : (
          <button onClick={() => setShowLoginModal(true)} className="text-sm font-bold px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded-full transition-colors shadow-lg">Sign In</button>
        )}
      </div>

      {/* LOGIN MODAL */}
      {!user && showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-[#111111] border border-neutral-800 p-8 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl font-black mb-2 tracking-tight">Welcome to VibePath.</h2>
            <p className="text-neutral-400 text-sm mb-6">Sign in to save your favorite routes and unlock premium features.</p>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input 
                type="email" required placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500/50 text-white"
              />
              <button disabled={authLoading} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold rounded-xl disabled:opacity-50 text-white">
                {authLoading ? "Sending Link..." : "Send Magic Link ✨"}
              </button>
            </form>
            {authMsg && <p className="mt-4 text-center text-sm text-pink-400 font-medium">{authMsg}</p>}
          </div>
        </div>
      )}

      {/* --- REST OF THE UI --- */}
      <div className="w-full max-w-3xl mt-4 flex flex-col items-center">
        <div className="text-center mb-10">
          <h1 className="text-5xl sm:text-6xl font-black mb-4 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">VibePath.</h1>
        </div>

        {errorMsg && <div className="w-full bg-red-900/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl mb-8 font-medium text-center text-sm">🚨 {errorMsg}</div>}

{/* 🔥 TONIGHT IN CHICAGO DASHBOARD */}
        {liveEvents.length > 0 && (
          <div className="w-full bg-[#111111] border border-orange-500/30 rounded-[2rem] p-6 sm:p-8 shadow-[0_0_30px_rgba(249,115,22,0.15)] mb-8 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500"></div>
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span> Tonight in Chicago
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {liveEvents.map((event, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMood("🎫 Live Event");
                    setVibe(`I'm going to ${event.name} at ${event.venue}. Build me a pre-game and post-game route nearby.`);
                  }}
                  className="text-left p-4 bg-[#1a1a1a] border border-neutral-800 hover:border-orange-500/50 hover:bg-orange-500/10 rounded-xl transition-all group flex flex-col justify-between"
                >
                  <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-orange-300 flex items-center gap-1">
                    🎫 {event.venue}
                  </p>
                  <p className="text-sm font-bold text-white leading-snug">{event.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}



        {/* Control Panel */}
        <div className="w-full bg-[#111111] border border-neutral-800/80 rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-12">
          
          <div className="mb-8 pb-8 border-b border-neutral-800/50">
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Where are we starting?</label>
            <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Type a neighborhood..." className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white" />
              <button onClick={grabExactLocation} disabled={findingGPS} className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2">
                {findingGPS ? "⏳ Locating..." : "📍 GPS"}
              </button>
            </div>
          </div>

          {/* Grid Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
            <div><label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">When?</label><div className="flex flex-col gap-2">{["Right Now", "Later Tonight", "Tomorrow"].map(opt => <button key={opt} onClick={() => setTiming(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left ${timing === opt ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>{opt}</button>)}</div></div>
            <div><label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Transit?</label><div className="flex flex-col gap-2">{["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map(opt => <button key={opt} onClick={() => setTransit(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left ${transit === opt ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>{opt}</button>)}</div></div>
            <div><label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Radius?</label><div className="flex flex-col gap-2">{["Neighborhood", "< 3 Miles", "Anywhere"].map(opt => <button key={opt} onClick={() => setDistance(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold text-left ${distance === opt ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>{opt}</button>)}</div></div>
          </div>

          {/* Goals & Prompts */}
          <div>
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">What's the goal today?</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {["🏃 Running Route", "🚶 Walking Route", "☕ Coffee Run", "🐕 Walk Dog", "🧘 Reset Mind", "🌆 Explore City", "🗣️ Deep Talks", "🪩 Turn Up", "📸 Aesthetic", "🍔 Food Coma", "🎫 Live Event"].map(pin => (
                <button key={pin} onClick={() => setMood(mood === pin ? "" : pin)} className={`px-4 py-2 rounded-full text-sm font-semibold border ${mood === pin ? 'bg-white text-black border-white' : 'bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:border-neutral-600'}`}>{pin}</button>
              ))}
            </div>

            <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
              <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Add specific details (e.g. Needs a skyline view...)" className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white" onKeyDown={(e) => e.key === 'Enter' && generateItinerary()} />
              <button onClick={generateItinerary} disabled={loading || (!mood && !vibe)} className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
                {loading ? "Routing..." : "Route It"}
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS AREA */}
        {itinerary && itinerary.plan && (
          <div className="w-full animate-fade-in flex flex-col items-center pb-24">
            <div className="text-center mb-6">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">{itinerary.title}</h2>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-1.5 bg-purple-900/30 text-purple-400 rounded-full text-xs font-bold border border-purple-700/50 uppercase tracking-wide">{party} • {budget}</span>
                <span className="px-4 py-1.5 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50 uppercase tracking-wide">{mood || vibe || itinerary.vibe}</span>
              </div>
            </div>

            {/* 🚨 THE RESTORED WEATHER WIDGET (Mapped to your custom backend) 🚨 */}
            {(itinerary.weather || itinerary.outfit_tip) && (
              <div className="w-full max-w-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/50 p-4 rounded-2xl mb-8 flex flex-col gap-2 shadow-lg">
                {itinerary.weather && (
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                    <span className="text-lg">☁️</span>
                    <span>Live Weather: {itinerary.weather}</span>
                  </div>
                )}
                {itinerary.outfit_tip && (
                  <p className="text-blue-200/80 text-xs leading-relaxed text-left pl-7">
                    <span className="font-bold text-blue-300">Concierge Tip:</span> {itinerary.outfit_tip}
                  </p>
                )}
              </div>
            )}

            {routeId && (
              <div className="mb-8">
                <button onClick={handleShare} className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all border flex items-center gap-2 ${copied ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-[#1a1a1a] text-white border-neutral-700 hover:bg-[#2a2a2a]'}`}>
                  {copied ? "✅ Link Copied!" : "🔗 Share this Vibe"}
                </button>
              </div>
            )}

            <div className="space-y-4 w-full">
              {itinerary.plan.map((step: any, index: number) => (
                <div key={index} className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>
                  <div className="flex flex-col py-1 pl-2">
                    <div className="mb-4"><span className="bg-black border border-neutral-800 text-pink-400 font-bold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full inline-block">{step.time || "Time TBD"}</span></div>
                    <h3 className="text-xl font-bold text-white mb-1">{step.title || "Hidden Gem"}</h3>
                    <p className="text-pink-500 text-xs font-bold mb-3 tracking-wide">📍 {step.place || location}</p>
                    <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{step.description}</p>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      <button onClick={() => openMaps(step.place)} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md">🗺️ Google Maps</button>
                      <button onClick={() => openUber(step.place)} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md">🚗 Request Uber</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}