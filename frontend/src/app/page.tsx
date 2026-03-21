"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  const grabExactLocation = () => {
    setFindingGPS(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
          setFindingGPS(false);
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Couldn't grab your exact location. You can just type your neighborhood!");
          setFindingGPS(false);
        }
      );
    } else {
      alert("GPS is not supported by this browser.");
      setFindingGPS(false);
    }
  };

  // const generateItinerary = async () => {
  //   if (!mood && !vibe) return;

  //   setLoading(true);
  //   setItinerary(null);
  //   setErrorMsg("");

  //   const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

  //   let formattedLocation = location.trim() || "Chicago, IL";
  //   if (!formattedLocation.includes(",") && !formattedLocation.toLowerCase().includes("chicago")) {
  //     formattedLocation = `${formattedLocation}, Chicago, IL`;
  //   }

  //   const payload = {
  //     timing, transit, distance, party, budget, mood, prompt: vibe, time_context: currentTime, location: formattedLocation
  //   };

  //   try {
  //     const response = await fetch("http://127.0.0.1:8000/api/route", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     if (!response.ok) throw new Error(`Server rejected the request. Status: ${response.status}`);

  //     const data = await response.json();
  //     const parsedData = JSON.parse(data.reply);

  //     if (parsedData.error) setErrorMsg(`Backend Error: ${parsedData.error}`);
  //     else setItinerary(parsedData);

  //   } catch (error: any) {
  //     console.error("Fetch Error:", error);
  //     setErrorMsg(error.message || "Network Error: Failed to reach the Python server.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };


const generateItinerary = async () => {
    if (!mood && !vibe) return;

    console.log("1. 🚀 Button clicked! Starting routing process...");
    setLoading(true);
    setItinerary(null);
    setErrorMsg("");

    const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

    let formattedLocation = location.trim() || "Chicago, IL";
    if (!formattedLocation.includes(",") && !formattedLocation.toLowerCase().includes("chicago")) {
      formattedLocation = `${formattedLocation}, Chicago, IL`;
    }

    const payload = {
      timing, transit, distance, party, budget, mood, prompt: vibe, time_context: currentTime, location: formattedLocation
    };

    console.log("2. 📦 Payload prepared:", payload);

    try {
      console.log("3. 📡 Attempting to contact Python server at 127.0.0.1...");
      
      // 🚨 FIX: Explicitly forcing IPv4 so it doesn't get lost in Windows localhost translation
      const response = await fetch("http://127.0.0.1:8080/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("4. 📥 Python server responded! Status:", response.status);

      if (!response.ok) throw new Error(`Server rejected the request. Status: ${response.status}`);

      const data = await response.json();
      console.log("5. 🧠 Raw data received from backend.");
      
      const parsedData = JSON.parse(data.reply);
      
      if (parsedData.error) setErrorMsg(`Backend Error: ${parsedData.error}`);
      else setItinerary(parsedData);

      console.log("6. ✅ UI Updated successfully!");

    } catch (error: any) {
      console.error("❌ Fetch Error caught:", error);
      setErrorMsg(error.message || "Network Error: Failed to reach the Python server.");
    } finally {
      setLoading(false);
      console.log("7. 🏁 Routing process finished.");
    }
  };



  const openMaps = (placeName: string) => {
    const destination = encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${destination}`, '_blank');
  };

  const openUber = (placeName: string) => {
    const destination = encodeURIComponent(`${placeName}, ${location || 'Chicago, IL'}`);
    window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destination}`, '_blank');
  };

  if (!mounted) return <div className="min-h-screen bg-[#111111]"></div>;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl mt-8 sm:mt-12 flex flex-col items-center">

        <div className="text-center mb-10">
          <h1 className="text-6xl sm:text-7xl font-black mb-4 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VibePath.
          </h1>
        </div>

        {errorMsg && (
          <div className="w-full max-w-2xl bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-2xl mb-8 font-bold text-center text-lg">
            🚨 {errorMsg}
          </div>
        )}

        <div className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-[2rem] p-6 sm:p-10 shadow-2xl mb-12">

          {/* Location Bar - LARGER FONT */}
          <div className="mb-10 pb-10 border-b border-neutral-800/50">
            <label className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4 block">Where are we starting?</label>
            <div className="flex bg-[#111111] border border-neutral-700 rounded-2xl p-2 focus-within:border-blue-500 transition-all">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Type a neighborhood (e.g., Wicker Park) or use GPS..."
                className="flex-1 bg-transparent px-5 py-4 text-base focus:outline-none placeholder-neutral-600 text-white"
              />
              <button
                onClick={grabExactLocation}
                disabled={findingGPS}
                className="px-8 py-4 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 text-white rounded-xl font-bold text-base transition-all flex items-center gap-2"
              >
                {findingGPS ? "⏳ Locating..." : "📍 Use GPS"}
              </button>
            </div>
          </div>

          {/* Grid Buttons - LARGER FONT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10 pb-10 border-b border-neutral-800/50">
            <div>
              <label className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4 block">When?</label>
              <div className="flex flex-col gap-3">
                {["Right Now", "Later Tonight", "Tomorrow"].map((opt) => (
                  <button key={opt} onClick={() => setTiming(opt)} className={`py-3 px-4 rounded-xl text-base font-semibold transition-all text-left ${timing === opt ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4 block">Transit?</label>
              <div className="flex flex-col gap-3">
                {["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map((opt) => (
                  <button key={opt} onClick={() => setTransit(opt)} className={`py-3 px-4 rounded-xl text-base font-semibold transition-all text-left ${transit === opt ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4 block">Radius?</label>
              <div className="flex flex-col gap-3">
                {["Neighborhood", "< 3 Miles", "Anywhere"].map((opt) => (
                  <button key={opt} onClick={() => setDistance(opt)} className={`py-3 px-4 rounded-xl text-base font-semibold transition-all text-left ${distance === opt ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Goals - LARGER FONT */}
          <div>
            <label className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4 block">What's the goal today?</label>
            <div className="flex flex-wrap gap-3 mb-6">
              {["☕ Coffee Run", "🐕 Walk Dog", "🏃 Running Route", "🧘 Reset Mind", "🌆 Explore City", "🪩 Turn Up", "🍔 Food Coma"].map((pin) => (
                <button
                  key={pin}
                  onClick={() => setMood(mood === pin ? "" : pin)}
                  className={`px-5 py-3 rounded-full text-base font-bold transition-all border ${mood === pin ? 'bg-white text-black border-white shadow-md' : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}
                >
                  {pin}
                </button>
              ))}
            </div>

            <div className="flex bg-[#111111] border border-neutral-700 rounded-2xl p-2 focus-within:border-pink-500 transition-all">
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Add specific details (e.g. Needs a dog park...)"
                className="flex-1 bg-transparent px-5 py-4 text-base focus:outline-none placeholder-neutral-600 text-white"
                onKeyDown={(e) => e.key === 'Enter' && generateItinerary()}
              />
              <button
                onClick={generateItinerary}
                disabled={loading || (!mood && !vibe)}
                className="px-10 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold text-base transition-all whitespace-nowrap"
              >
                {loading ? "Routing..." : "Route It"}
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS AREA - RESTORED IMAGES + BIGGER FONTS */}
        {itinerary && itinerary.plan && (
          <div className="w-full max-w-3xl animate-fade-in flex flex-col items-center pb-20">

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-[#e5e5e5] mb-4">{itinerary.title}</h2>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-2 bg-purple-900/30 text-purple-400 rounded-full text-sm font-bold border border-purple-700/50">
                  {party} • {budget}
                </span>
                <span className="px-4 py-2 bg-pink-900/30 text-pink-400 rounded-full text-sm font-bold border border-pink-700/50">
                  {mood || vibe || itinerary.vibe}
                </span>
              </div>
            </div>

            <div className="w-full bg-[#1a1a24] border border-[#2a2a35] rounded-3xl p-6 mb-10 flex items-start gap-5 shadow-lg">
              <div className="text-4xl mt-1">☁️</div>
              <div>
                <h4 className="text-white font-bold mb-2 text-base">
                  Live Weather <span className="text-blue-400 font-normal ml-2">{itinerary.weather}</span>
                </h4>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  <span className="font-bold text-purple-400">Concierge Tip:</span> {itinerary.outfit_tip}
                </p>
              </div>
            </div>

            <div className="space-y-6 w-full">
              {itinerary.plan.map((step: any, index: number) => (
                // THE NEW RESTORED IMAGE CARD
                <div key={index} className="bg-[#1a1a1a] border border-neutral-800 hover:border-neutral-700 transition-colors rounded-3xl p-6 flex flex-col sm:flex-row gap-8 shadow-xl relative overflow-hidden group">
                  
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>

                  {/* 📸 ANTI-SQUEEZE IMAGE */}
                  <div className="w-full sm:w-56 h-64 sm:h-auto shrink-0 rounded-2xl overflow-hidden relative shadow-md bg-neutral-900">
                    <img 
                      src={step.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=800&auto=format&fit=crop"} 
                      alt={step.place} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>

                  {/* 📝 CONTENT CONTAINER */}
                  <div className="flex-1 flex flex-col py-2">
                    <div className="mb-2">
                      <span className="text-neutral-400 font-bold text-base tracking-wide uppercase">
                        {step.time || "Time TBD"}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-[#e5e5e5] mb-2 leading-tight">
                      {step.title || "Hidden Gem"}
                    </h3>

                    <p className="text-pink-500 text-sm font-bold mb-4 tracking-wider">
                      📍 {step.place || location}
                    </p>

                    <p className="text-neutral-400 text-base mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    {/* BIGGER BUTTONS */}
                    <div className="flex gap-4 mt-auto">
                      <button
                        onClick={() => openMaps(step.place)}
                        className="bg-[#2a2a2a] text-[#e5e5e5] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#333] transition-colors flex items-center gap-2"
                      >
                        🗺️ Maps
                      </button>
                      <button
                        onClick={() => openUber(step.place)}
                        className="bg-[#2a2a2a] text-[#e5e5e5] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#333] transition-colors flex items-center gap-2"
                      >
                        🚗 Uber
                      </button>
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