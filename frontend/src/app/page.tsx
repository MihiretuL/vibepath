// "use client";
// import { useState, useEffect } from "react";

// export default function Home() {
//   const [mounted, setMounted] = useState(false);
//   useEffect(() => { setMounted(true); }, []);

//   // --- STATE MANAGEMENT ---
//   const [location, setLocation] = useState("");
//   const [findingGPS, setFindingGPS] = useState(false);

//   const [timing, setTiming] = useState("Right Now");
//   const [transit, setTransit] = useState("🚶 Walk");
//   const [distance, setDistance] = useState("Neighborhood");

//   const [party, setParty] = useState("Solo");
//   const [budget, setBudget] = useState("$$");

//   const [mood, setMood] = useState("");
//   const [vibe, setVibe] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [itinerary, setItinerary] = useState<any>(null);
//   const [errorMsg, setErrorMsg] = useState("");
  
//   // 🚨 NEW: States for our Viral Share Loop
//   const [routeId, setRouteId] = useState<string | null>(null);
//   const [copied, setCopied] = useState(false);

//   // --- ACTIONS ---
//   const grabExactLocation = () => {
//     setFindingGPS(true);
//     if ("geolocation" in navigator) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
//           setFindingGPS(false);
//         },
//         (error) => {
//           console.error("GPS Error:", error);
//           alert("Couldn't grab exact location. You can just type your neighborhood!");
//           setFindingGPS(false);
//         }
//       );
//     } else {
//       alert("GPS is not supported by this browser.");
//       setFindingGPS(false);
//     }
//   };

//   const generateItinerary = async () => {
//     if (!mood && !vibe) return;

//     setLoading(true);
//     setItinerary(null);
//     setRouteId(null);
//     setErrorMsg("");

//     const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

//     let formattedLocation = location.trim() || "Chicago, IL";
//     if (!formattedLocation.includes(",") && !formattedLocation.toLowerCase().includes("chicago")) {
//       formattedLocation = `${formattedLocation}, Chicago, IL`;
//     }

//     const payload = {
//       timing, transit, distance, party, budget, mood, prompt: vibe, time_context: currentTime, location: formattedLocation
//     };

//     try {
//       const response = await fetch("http://127.0.0.1:8080/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!response.ok) throw new Error(`Server rejected the request. Status: ${response.status}`);

//       const data = await response.json();
//       const parsedData = JSON.parse(data.reply);

//       if (parsedData.error) {
//         setErrorMsg(`Backend Error: ${parsedData.error}`);
//       } else {
//         setItinerary(parsedData);
//         // 🚨 NEW: Capture the Database ID from Python!
//         if (data.route_id) {
//           setRouteId(data.route_id);
//         }
//       }

//     } catch (error: any) {
//       console.error("Fetch Error:", error);
//       setErrorMsg(error.message || "Network Error: Failed to reach the Python server.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openMaps = (placeName: string) => {
//     const destination = encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`);
//     window.open(`https://www.google.com/maps/search/?api=1&query=${destination}`, '_blank');
//   };

//   const openUber = (placeName: string) => {
//     const destination = encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`);
//     window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destination}`, '_blank');
//   };

//   // 🚨 NEW: The Copy Link Function
//   const handleShare = () => {
//     if (!routeId) return;
//     const shareLink = `${window.location.origin}/route/${routeId}`;
//     navigator.clipboard.writeText(shareLink);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2500);
//   };

//   // Prevent hydration mismatch
//   if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]"></div>;

//   return (
//     <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30">
//       <div className="w-full max-w-3xl mt-8 sm:mt-12 flex flex-col items-center">

//         {/* Header */}
//         <div className="text-center mb-10">
//           <h1 className="text-5xl sm:text-6xl font-black mb-4 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
//             VibePath.
//           </h1>
//         </div>

//         {/* Error State */}
//         {errorMsg && (
//           <div className="w-full bg-red-900/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl mb-8 font-medium text-center text-sm shadow-lg">
//             🚨 {errorMsg}
//           </div>
//         )}

//         {/* Control Panel */}
//         <div className="w-full bg-[#111111] border border-neutral-800/80 rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-12">
          
//           {/* Location Bar */}
//           <div className="mb-8 pb-8 border-b border-neutral-800/50">
//             <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Where are we starting?</label>
//             <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
//               <input
//                 type="text"
//                 value={location}
//                 onChange={(e) => setLocation(e.target.value)}
//                 placeholder="Type a neighborhood..."
//                 className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
//               />
//               <button
//                 onClick={grabExactLocation}
//                 disabled={findingGPS}
//                 className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
//               >
//                 {findingGPS ? "⏳ Locating..." : "📍 GPS"}
//               </button>
//             </div>
//           </div>

//           {/* Grid Settings */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">When?</label>
//               <div className="flex flex-col gap-2">
//                 {["Right Now", "Later Tonight", "Tomorrow"].map((opt) => (
//                   <button key={opt} onClick={() => setTiming(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-left ${timing === opt ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Transit?</label>
//               <div className="flex flex-col gap-2">
//                 {["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map((opt) => (
//                   <button key={opt} onClick={() => setTransit(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-left ${transit === opt ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Radius?</label>
//               <div className="flex flex-col gap-2">
//                 {["Neighborhood", "< 3 Miles", "Anywhere"].map((opt) => (
//                   <button key={opt} onClick={() => setDistance(opt)} className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-left ${distance === opt ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Goals & Prompts */}
//           <div>
//             <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">What's the goal today?</label>
//             <div className="flex flex-wrap gap-2 mb-5">
//               {["🏃 Running Route", "🚶 Walking Route", "☕ Coffee Run", "🐕 Walk Dog", "🧘 Reset Mind", "🌆 Explore City", "🗣️ Deep Talks", "🪩 Turn Up", "📸 Aesthetic", "🍔 Food Coma"].map((pin) => (
//                 <button
//                   key={pin}
//                   onClick={() => setMood(mood === pin ? "" : pin)}
//                   className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${mood === pin ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-[#1a1a1a] text-neutral-400 border-neutral-800 hover:border-neutral-600'}`}
//                 >
//                   {pin}
//                 </button>
//               ))}
//             </div>

//             <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-xl p-1.5 focus-within:border-pink-500/50 transition-all">
//               <input
//                 type="text"
//                 value={vibe}
//                 onChange={(e) => setVibe(e.target.value)}
//                 placeholder="Add specific details (e.g. Needs a skyline view...)"
//                 className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
//                 onKeyDown={(e) => e.key === 'Enter' && generateItinerary()}
//               />
//               <button
//                 onClick={generateItinerary}
//                 disabled={loading || (!mood && !vibe)}
//                 className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap shadow-lg"
//               >
//                 {loading ? "Routing..." : "Route It"}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* RESULTS AREA */}
//         {itinerary && itinerary.plan && (
//           <div className="w-full animate-fade-in flex flex-col items-center pb-24">

//             <div className="text-center mb-6">
//               <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">{itinerary.title}</h2>
//               <div className="flex flex-wrap justify-center gap-3">
//                 <span className="px-4 py-1.5 bg-purple-900/30 text-purple-400 rounded-full text-xs font-bold border border-purple-700/50 uppercase tracking-wide">
//                   {party} • {budget}
//                 </span>
//                 <span className="px-4 py-1.5 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50 uppercase tracking-wide">
//                   {mood || vibe || itinerary.vibe}
//                 </span>
//               </div>
//             </div>

//             {/* 🚨 NEW: Share Button */}
//             {routeId && (
//               <div className="mb-8">
//                 <button
//                   onClick={handleShare}
//                   className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all border flex items-center gap-2 shadow-lg ${
//                     copied 
//                     ? 'bg-green-500/20 text-green-400 border-green-500/50' 
//                     : 'bg-[#1a1a1a] text-white border-neutral-700 hover:bg-[#2a2a2a]'
//                   }`}
//                 >
//                   {copied ? "✅ Link Copied!" : "🔗 Share this Vibe"}
//                 </button>
//               </div>
//             )}

//             <div className="w-full bg-[#13131a] border border-[#2a2a35]/50 rounded-2xl p-5 mb-8 flex items-center gap-4 shadow-lg">
//               <div className="text-3xl">☁️</div>
//               <div>
//                 <h4 className="text-white font-bold text-sm mb-1">
//                   Live Weather <span className="text-blue-400 font-medium ml-2">{itinerary.weather}</span>
//                 </h4>
//                 <p className="text-neutral-400 text-xs leading-relaxed">
//                   <span className="font-bold text-purple-400">Concierge Tip:</span> {itinerary.outfit_tip}
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-4 w-full">
//               {itinerary.plan.map((step: any, index: number) => (
//                 <div key={index} className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
                  
//                   {/* Neon Left Accent */}
//                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>

//                   <div className="flex flex-col py-1 pl-2">
//                     {/* Time Pill */}
//                     <div className="mb-4">
//                       <span className="bg-black border border-neutral-800 text-pink-400 font-bold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full inline-block">
//                         {step.time || "Time TBD"}
//                       </span>
//                     </div>

//                     <h3 className="text-xl font-bold text-white mb-1">
//                       {step.title || "Hidden Gem"}
//                     </h3>

//                     <p className="text-pink-500 text-xs font-bold mb-3 tracking-wide">
//                       📍 {step.place || location}
//                     </p>

//                     <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
//                       {step.description}
//                     </p>

//                     {/* Maps & Uber Buttons */}
//                     <div className="flex flex-wrap gap-3 mt-auto">
//                       <button
//                         onClick={() => openMaps(step.place)}
//                         className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2 shadow-md"
//                       >
//                         🗺️ Google Maps
//                       </button>
//                       <button
//                         onClick={() => openUber(step.place)}
//                         className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2 shadow-md"
//                       >
//                         🚗 Request Uber
//                       </button>
//                     </div>

//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; // 🚨 Our new database connection!

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
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

  // --- ACTIONS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setAuthMsg(`❌ ${error.message}`);
    } else {
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
      user_id: user?.id || null // 🚨 Pass the user ID to Python!
    };

    try {
      const response = await fetch("http://127.0.0.1:8080/api/route", {
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

  const openMaps = (placeName: string) => window.open(`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`)}`, '_blank');
  const openUber = (placeName: string) => window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`)}`, '_blank');

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]"></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30 relative">
      
      {/* 🚨 AUTH HEADER 🚨 */}
      <div className="w-full max-w-5xl flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">Hey, {user.email?.split('@')[0]} 👋</span>
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
              <button disabled={authLoading} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold rounded-xl disabled:opacity-50">
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
              {["🏃 Running Route", "🚶 Walking Route", "☕ Coffee Run", "🐕 Walk Dog", "🧘 Reset Mind", "🌆 Explore City", "🗣️ Deep Talks", "🪩 Turn Up", "📸 Aesthetic", "🍔 Food Coma"].map(pin => (
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