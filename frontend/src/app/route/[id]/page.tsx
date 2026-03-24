"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SharedRoutePage() {
  const params = useParams();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/route/${params.id}`);
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

    if (params.id) fetchRoute();
  }, [params.id]);

  const openMaps = (placeName: string) => {
    const destination = encodeURIComponent(`${placeName}, Chicago, IL`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${destination}`, '_blank');
  };

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
        <div className="text-6xl mb-4">💔</div>
        <h1 className="text-2xl font-bold text-red-400 mb-4">Vibe Not Found</h1>
        <p className="text-neutral-400 mb-8">{errorMsg}</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-white text-black font-bold rounded-full">
          Create Your Own
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-pink-500/30">
      <div className="w-full max-w-3xl mt-8 sm:mt-12 flex flex-col items-center pb-24">
        
        {/* Top Branding encouraging them to make their own */}
        <div onClick={() => router.push('/')} className="cursor-pointer text-center mb-12 hover:scale-105 transition-transform">
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">Made with</p>
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VibePath.
          </h1>
        </div>

        {/* The Shared Route */}
        {itinerary && itinerary.plan && (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">{itinerary.title}</h2>
              <div className="flex justify-center gap-3">
                <span className="px-4 py-1.5 bg-pink-900/30 text-pink-400 rounded-full text-xs font-bold border border-pink-700/50 uppercase tracking-wide">
                  Shared Vibe
                </span>
              </div>
            </div>

           {/* 🚨 THE FIXED SHARED CARDS */}
            <div className="space-y-6 w-full max-w-2xl mx-auto">
              {itinerary.plan.map((step: any, index: number) => (
                <div key={index} className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
                  {/* The Vertical Accent Line */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 to-purple-600"></div>
                  
                  <div className="flex flex-col py-1 pl-6">
                    <div className="mb-4">
                      <span className="bg-black border border-neutral-800 text-pink-400 font-bold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full inline-block">
                        {step.time || "Time TBD"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    
                    {/* 🚨 FIXED: Only ONE Location line! */}
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

                    {/* 🚨 FIXED: Only ONE Description line! */}
                    <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{step.description}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-auto">
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.place + ", Chicago, IL")}`, "_blank")} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md">🗺️ Google Maps</button>
                      
{/* 🚨 THE RETURN OF THE UBER BUTTON */}
<button onClick={() => window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(step.place + ", Chicago, IL")}`, "_blank")} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-neutral-200 shadow-md">🚗 Request Uber</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            
            {/* The Call to Action Loop */}
            <div className="mt-16 w-full bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-pink-500/30 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">Want to plan your own night?</h3>
              <p className="text-pink-200/70 text-sm mb-6">AI-generated itineraries for any vibe, any time.</p>
              <button onClick={() => router.push('/')} className="px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold text-sm transition-all shadow-lg">
                Try VibePath Free
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}