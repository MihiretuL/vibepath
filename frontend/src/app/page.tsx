// "use client";

// import { useState } from "react";

// export default function Home() {
//   const [prompt, setPrompt] = useState("");
//   const [response, setResponse] = useState("");
//   const [loading, setLoading] = useState(false);

//   // We upgraded this to accept a direct string from the Quick Taps!
//   const handleRoute = async (customPrompt?: string) => {
//     const textToRoute = typeof customPrompt === "string" ? customPrompt : prompt;
//     if (!textToRoute) return;
    
//     setLoading(true);
    
//     try {
//       const res = await fetch("http://localhost:127.0.0.1/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ prompt: textToRoute })
//       });
      
//       const data = await res.json();
//       setResponse(data.reply);
//     } catch (error) {
//       setResponse("Error: Is your Python backend running?");
//     }
    
//     setLoading(false);
//   };

//   return (
//     <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-50">
//       <div className="max-w-2xl w-full space-y-8 text-center">
        
//         <h1 className="text-6xl font-bold tracking-tighter">
//           Vibepath<span className="text-violet-500">.</span>
//         </h1>
//         <p className="text-xl text-zinc-400 font-light">
//           The city, curated by your mood. What&apos;s the vibe tonight?
//         </p>

//         <div className="relative mt-10 shadow-2xl shadow-violet-900/20">
//           <input
//             type="text"
//             value={prompt}
//             onChange={(e) => setPrompt(e.target.value)}
//             onKeyDown={(e) => e.key === 'Enter' && handleRoute()} // Press Enter to route!
//             placeholder="e.g., low-key date night with great cocktails..."
//             className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-zinc-600"
//           />
//           <button 
//             onClick={() => handleRoute()}
//             disabled={loading}
//             className="absolute right-3 top-3 bottom-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl px-6 transition-colors shadow-lg shadow-violet-500/30 disabled:opacity-50"
//           >
//             {loading ? "Routing..." : "Route"}
//           </button>
//         </div>

//         {/* Quick Vibe Taps - RESTORED AND FUNCTIONAL */}
//         <div className="pt-8 flex flex-wrap justify-center gap-3 text-sm text-zinc-400">
//           <button 
//             onClick={() => { setPrompt("⚡ High Energy"); handleRoute("⚡ High Energy"); }}
//             className="bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-full cursor-pointer hover:bg-zinc-800 hover:border-violet-500/50 hover:text-white transition-all"
//           >
//             ⚡ High Energy
//           </button>
//           <button 
//             onClick={() => { setPrompt("🍷 Chill Date"); handleRoute("🍷 Chill Date"); }}
//             className="bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-full cursor-pointer hover:bg-zinc-800 hover:border-violet-500/50 hover:text-white transition-all"
//           >
//             🍷 Chill Date
//           </button>
//           <button 
//             onClick={() => { setPrompt("🎨 Inspired"); handleRoute("🎨 Inspired"); }}
//             className="bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-full cursor-pointer hover:bg-zinc-800 hover:border-violet-500/50 hover:text-white transition-all"
//           >
//             🎨 Inspired
//           </button>
//         </div>

//         {/* Python's answer */}
//         {response && (
//           <div className="mt-8 p-6 bg-zinc-900 border border-violet-500/30 rounded-xl text-violet-300 text-left whitespace-pre-wrap">
//             {response}
//           </div>
//         )}

//       </div>
//     </main>
//   );
// }


"use client";
import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoute = async (OverridePrompt?: string) => {
    const finalPrompt = OverridePrompt || prompt;
    if (!finalPrompt) return;
    
    setLoading(true);
    setResponse(""); // Clear old answers
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt })
      });
      const data = await res.json();
      setResponse(data.reply);
    } catch (err) {
      setResponse("Connection Error: Is the Python terminal open and running?");
    } finally {
      setLoading(false); // This ensures the button ALWAYS unlocks
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-50">
      <div className="max-w-2xl w-full space-y-8 text-center font-sans">
        <h1 className="text-6xl font-bold tracking-tighter">Vibepath<span className="text-violet-500">.</span></h1>
        
        <div className="relative mt-10">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What's the vibe?"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 px-6 text-lg focus:ring-2 focus:ring-violet-500 outline-none text-white"
          />
          <button 
            onClick={() => handleRoute()}
            className="absolute right-3 top-3 bottom-3 bg-violet-600 px-6 rounded-xl font-bold hover:bg-violet-500 transition-all"
          >
            {loading ? "..." : "Route"}
          </button>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={() => { setPrompt("🍷 Chill Date"); handleRoute("🍷 Chill Date"); }} className="text-zinc-500 hover:text-violet-400">🍷 Chill Date</button>
          <button onClick={() => { setPrompt("⚡ High Energy"); handleRoute("⚡ High Energy"); }} className="text-zinc-500 hover:text-violet-400">⚡ High Energy</button>
        </div>

        {response && (
          <div className="mt-10 p-6 bg-zinc-900 border border-violet-500/30 rounded-2xl text-left text-violet-100">
            {response}
          </div>
        )}
      </div>
    </main>
  );
}