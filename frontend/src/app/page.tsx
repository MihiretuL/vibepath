// "use client";
// import { useState } from "react";

// export default function Home() {
//   // 1. The Hyper-Context React State
//   // Logistics
//   const [timing, setTiming] = useState("Right Now");
//   const [transit, setTransit] = useState("🚶 Walk");
//   const [distance, setDistance] = useState("Neighborhood");
  
//   // Social
//   const [party, setParty] = useState("Solo");
//   const [budget, setBudget] = useState("$$");
  
//   // Emotional
//   const [mood, setMood] = useState("");
//   const [vibe, setVibe] = useState(""); // The custom text box
  
//   const [loading, setLoading] = useState(false);
//   const [itinerary, setItinerary] = useState<any>(null);

//   // 2. The Engine Starter
//   const generateItinerary = async () => {
//     // Require either a mood pin OR custom text to proceed
//     if (!mood && !vibe) return; 
    
//     setLoading(true);
//     setItinerary(null);

//     const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

//     // Packaging the massive context payload
//     const payload = {
//       timing: timing,
//       transit: transit,
//       distance: distance,
//       party: party,
//       budget: budget,
//       mood: mood,
//       prompt: vibe,
//       time_context: currentTime
//     };

//     try {
//       const response = await fetch("http://127.0.0.1:8000/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();
//       const parsedData = JSON.parse(data.reply);
//       setItinerary(parsedData);
      
//     } catch (error) {
//       console.error("Error fetching route:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      
//       <div className="w-full max-w-3xl mt-8 sm:mt-12 flex flex-col items-center">
        
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-5xl sm:text-6xl font-black mb-3 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
//             VibePath.
//           </h1>
//           <p className="text-neutral-400 text-base sm:text-lg font-medium">Your dynamic city companion.</p>
//         </div>

//         {/* The Master Context Dashboard */}
//         <div className="w-full bg-neutral-900/40 border border-neutral-800 rounded-[2rem] p-5 sm:p-8 shadow-2xl mb-12 backdrop-blur-sm">
          
//           {/* SECTION 1: Logistics (When, How, How Far) */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">When?</label>
//               <div className="flex flex-col gap-2">
//                 {["Right Now", "Later Tonight", "Tomorrow"].map((opt) => (
//                   <button key={opt} onClick={() => setTiming(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${timing === opt ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {timing === opt ? '● ' : '○ '} {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Transit?</label>
//               <div className="flex flex-col gap-2">
//                 {["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map((opt) => (
//                   <button key={opt} onClick={() => setTransit(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${transit === opt ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {transit === opt ? '● ' : '○ '} {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <div>
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Radius?</label>
//               <div className="flex flex-col gap-2">
//                 {["Neighborhood", "< 3 Miles", "Anywhere"].map((opt) => (
//                   <button key={opt} onClick={() => setDistance(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${distance === opt ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
//                     {distance === opt ? '● ' : '○ '} {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* SECTION 2: Social & Budget */}
//           <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-neutral-800/50">
//             <div className="flex-1">
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Who's Going?</label>
//               <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
//                 {["Solo", "Date", "Group"].map((opt) => (
//                   <button key={opt} onClick={() => setParty(opt)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${party === opt ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}>
//                     {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//             <div className="flex-1">
//               <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Budget</label>
//               <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
//                 {["$", "$$", "$$$"].map((opt) => (
//                   <button key={opt} onClick={() => setBudget(opt)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${budget === opt ? 'bg-green-900/40 text-green-400 border border-green-800/50 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}>
//                     {opt}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* SECTION 3: The Mood & Vibe */}
//           <div>
//             <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">What's the goal tonight?</label>
            
//             {/* The Mood Pins */}
//             <div className="flex flex-wrap gap-2 mb-4">
//               {["🧘 Reset Mind", "🌆 Explore City", "🗣️ Deep Talks", "🪩 Turn Up", "📸 Aesthetic", "🍔 Food Coma"].map((pin) => (
//                 <button 
//                   key={pin} 
//                   onClick={() => setMood(mood === pin ? "" : pin)}
//                   className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${mood === pin ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}
//                 >
//                   {pin}
//                 </button>
//               ))}
//             </div>

//             {/* The Custom Text Box */}
//             <div className="flex bg-neutral-950 border border-neutral-700 rounded-2xl p-1 focus-within:border-purple-500 transition-all shadow-inner">
//               <input 
//                 type="text" 
//                 value={vibe}
//                 onChange={(e) => setVibe(e.target.value)}
//                 placeholder="Add specific details (e.g. Needs a pool table...)" 
//                 className="flex-1 bg-transparent px-5 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
//                 onKeyDown={(e) => e.key === 'Enter' && generateItinerary()}
//               />
//               <button 
//                 onClick={generateItinerary}
//                 disabled={loading || (!mood && !vibe)}
//                 className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-lg"
//               >
//                 {loading ? "Routing..." : "Route It"}
//               </button>
//             </div>
//           </div>

//         </div>

//         {/* Results Area */}
//         {itinerary && itinerary.plan && (
//           <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center pb-20">
            
//             {/* Results Title and Badges */}
//             <div className="text-center mb-6">
//               <h2 className="text-3xl font-bold text-white mb-3">{itinerary.title}</h2>
//               <div className="flex flex-wrap justify-center gap-2">
//                 <span className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs font-bold border border-purple-700/50">
//                   {party} • {budget}
//                 </span>
//                 <span className="px-3 py-1 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50">
//                   {mood || vibe || itinerary.vibe}
//                 </span>
//               </div>
//             </div>

//             {/* THE CONCIERGE WEATHER & OUTFIT CARD */}
//             <div className="w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg backdrop-blur-sm">
//               <div className="text-4xl">☁️</div>
//               <div>
//                 <h4 className="text-white font-bold mb-1 flex items-center gap-2">
//                   Live Weather <span className="text-blue-400 text-sm font-mono">{itinerary.weather}</span>
//                 </h4>
//                 <p className="text-neutral-300 text-sm leading-relaxed">
//                   <span className="font-bold text-purple-400">Concierge Tip:</span> {itinerary.outfit_tip}
//                 </p>
//               </div>
//             </div>
            
//             {/* The Itinerary Cards Map Loop */}
//             <div className="space-y-6 w-full">
//               {itinerary.plan.map((step: any, index: number) => (
//                 <div key={index} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-lg relative overflow-hidden">
                  
//                   {/* Left edge gradient accent */}
//                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  
//                   {/* Time Badge */}
//                   <div className="bg-neutral-950 px-5 py-3 rounded-2xl border border-neutral-800 shrink-0 shadow-inner">
//                     <span className="text-purple-400 font-mono font-bold text-lg">{step.time}</span>
//                   </div>
                  
//                   {/* Location Details */}
//                   <div className="flex-1 text-center sm:text-left">
//                     <h3 className="text-xl font-bold mb-1 text-white">{step.title}</h3>
//                     <p className="text-pink-400 text-sm font-bold mb-3 flex items-center justify-center sm:justify-start gap-2">
//                       📍 {step.place}
//                     </p>
//                     <p className="text-neutral-400 text-sm mb-5 leading-relaxed">{step.description}</p>
//                     <button className="w-full sm:w-auto bg-neutral-800 text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-neutral-700 border border-neutral-700 transition-colors">
//                       {step.action}
//                     </button>
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
import { useState } from "react";

export default function Home() {
  const [timing, setTiming] = useState("Right Now");
  const [transit, setTransit] = useState("🚶 Walk");
  const [distance, setDistance] = useState("Neighborhood");
  
  const [party, setParty] = useState("Solo");
  const [budget, setBudget] = useState("$$");
  
  const [mood, setMood] = useState("");
  const [vibe, setVibe] = useState(""); 
  
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<any>(null);
  
  // 🚨 THE NEW BUG DETECTOR STATE
  const [errorMsg, setErrorMsg] = useState("");

  const generateItinerary = async () => {
    if (!mood && !vibe) return; 
    
    setLoading(true);
    setItinerary(null);
    setErrorMsg(""); // Clear old errors

    const currentTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true });

    const payload = {
      timing: timing,
      transit: transit,
      distance: distance,
      party: party,
      budget: budget,
      mood: mood,
      prompt: vibe,
      time_context: currentTime
    };

    try {
      // Changed to localhost instead of 127.0.0.1
     const response = await fetch("http://127.0.0.1:8000/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Catch backend crashes (like 500 errors)
      if (!response.ok) {
        throw new Error(`Server rejected the request (Status ${response.status}). Is Python running?`);
      }

      const data = await response.json();
      const parsedData = JSON.parse(data.reply);

      // Catch Gemini API errors wrapped in our JSON
      if (parsedData.error) {
        setErrorMsg(`Backend Error: ${parsedData.error}`);
      } else {
        setItinerary(parsedData);
      }
      
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setErrorMsg(error.message || "Network Error: Failed to reach the Python server on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      <div className="w-full max-w-3xl mt-8 sm:mt-12 flex flex-col items-center">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-black mb-3 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VibePath.
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg font-medium">Your dynamic city companion.</p>
        </div>

        {/* 🚨 THE BUG DETECTOR UI */}
        {errorMsg && (
          <div className="w-full max-w-2xl bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-2xl mb-8 font-bold text-center shadow-lg animate-fade-in">
            🚨 {errorMsg}
          </div>
        )}

        <div className="w-full bg-neutral-900/40 border border-neutral-800 rounded-[2rem] p-5 sm:p-8 shadow-2xl mb-12 backdrop-blur-sm">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pb-8 border-b border-neutral-800/50">
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">When?</label>
              <div className="flex flex-col gap-2">
                {["Right Now", "Later Tonight", "Tomorrow"].map((opt) => (
                  <button key={opt} onClick={() => setTiming(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${timing === opt ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {timing === opt ? '● ' : '○ '} {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Transit?</label>
              <div className="flex flex-col gap-2">
                {["🚶 Walk", "🚆 CTA", "🚗 Drive/Uber"].map((opt) => (
                  <button key={opt} onClick={() => setTransit(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${transit === opt ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {transit === opt ? '● ' : '○ '} {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Radius?</label>
              <div className="flex flex-col gap-2">
                {["Neighborhood", "< 3 Miles", "Anywhere"].map((opt) => (
                  <button key={opt} onClick={() => setDistance(opt)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left ${distance === opt ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                    {distance === opt ? '● ' : '○ '} {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-neutral-800/50">
            <div className="flex-1">
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Who's Going?</label>
              <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                {["Solo", "Date", "Group"].map((opt) => (
                  <button key={opt} onClick={() => setParty(opt)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${party === opt ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">Budget</label>
              <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                {["$", "$$", "$$$"].map((opt) => (
                  <button key={opt} onClick={() => setBudget(opt)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${budget === opt ? 'bg-green-900/40 text-green-400 border border-green-800/50 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 block">What's the goal tonight?</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {["🧘 Reset Mind", "🌆 Explore City", "🗣️ Deep Talks", "🪩 Turn Up", "📸 Aesthetic", "🍔 Food Coma"].map((pin) => (
                <button 
                  key={pin} 
                  onClick={() => setMood(mood === pin ? "" : pin)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${mood === pin ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}
                >
                  {pin}
                </button>
              ))}
            </div>

            <div className="flex bg-neutral-950 border border-neutral-700 rounded-2xl p-1 focus-within:border-purple-500 transition-all shadow-inner">
              <input 
                type="text" 
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Add specific details (e.g. Needs a pool table...)" 
                className="flex-1 bg-transparent px-5 py-3 text-sm focus:outline-none placeholder-neutral-600 text-white"
                onKeyDown={(e) => e.key === 'Enter' && generateItinerary()}
              />
              <button 
                onClick={generateItinerary}
                disabled={loading || (!mood && !vibe)}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-lg"
              >
                {loading ? "Routing..." : "Route It"}
              </button>
            </div>
          </div>
        </div>

        {itinerary && itinerary.plan && (
          <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center pb-20">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-3">{itinerary.title}</h2>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs font-bold border border-purple-700/50">
                  {party} • {budget}
                </span>
                <span className="px-3 py-1 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50">
                  {mood || vibe || itinerary.vibe}
                </span>
              </div>
            </div>

            <div className="w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg backdrop-blur-sm">
              <div className="text-4xl">☁️</div>
              <div>
                <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                  Live Weather <span className="text-blue-400 text-sm font-mono">{itinerary.weather}</span>
                </h4>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  <span className="font-bold text-purple-400">Concierge Tip:</span> {itinerary.outfit_tip}
                </p>
              </div>
            </div>
            
            <div className="space-y-6 w-full">
              {itinerary.plan.map((step: any, index: number) => (
                <div key={index} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  <div className="bg-neutral-950 px-5 py-3 rounded-2xl border border-neutral-800 shrink-0 shadow-inner">
                    <span className="text-purple-400 font-mono font-bold text-lg">{step.time}</span>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold mb-1 text-white">{step.title}</h3>
                    <p className="text-pink-400 text-sm font-bold mb-3 flex items-center justify-center sm:justify-start gap-2">
                      📍 {step.place}
                    </p>
                    <p className="text-neutral-400 text-sm mb-5 leading-relaxed">{step.description}</p>
                    <button className="w-full sm:w-auto bg-neutral-800 text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-neutral-700 border border-neutral-700 transition-colors">
                      {step.action}
                    </button>
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
