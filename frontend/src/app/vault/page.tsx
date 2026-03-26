"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// Initialize Supabase using your existing public environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function VaultPage() {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState<any>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchVault() {
      // 1. Get the currently logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // 2. Fetch all itineraries that belong ONLY to this user
      const { data, error } = await supabase
        .from("itineraries")
        .select("id, title, vibe, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }); // Newest first!

      if (error) {
        console.error("Error fetching vault:", error);
      } else {
        setItineraries(data || []);
      }

      setLoading(false);
    }

    fetchVault();
  }, []);

  // Show a loading state while fetching
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show this if they aren't logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-4">Your Vault is Locked 🔒</h1>
        <p className="text-neutral-400">
          Please sign in to view your saved paths.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">My Vault 🗄️</h1>
          <p className="text-neutral-400">
            All your generated adventures, safely stored.
          </p>
        </div>

        {itineraries.length === 0 ? (
          <div className="text-center py-20 border border-neutral-800 rounded-2xl bg-neutral-900/50">
            <p className="text-xl text-neutral-400 mb-4">
              Your vault is empty!
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors inline-block"
            >
              Generate your first Path
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((route) => (
              <Link href={`/route/${route.id}`} key={route.id}>
                <div className="p-6 border border-neutral-800 rounded-2xl bg-neutral-900 hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all group h-full flex flex-col cursor-pointer">
                  <h2 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">
                    {route.title || "My Pathzu Route"}
                  </h2>

                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-neutral-500">
                    <span className="px-3 py-1 bg-neutral-800 rounded-full truncate max-w-[150px]">
                      {route.vibe || "Custom Vibe"}
                    </span>
                    <span>
                      {new Date(route.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
