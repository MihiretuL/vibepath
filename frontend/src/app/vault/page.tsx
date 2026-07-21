"use client";
import Image from "next/image";
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
        .select("id, title, vibe, created_at, full_json")
        .eq("user_id", user.id)
        .eq("is_saved_to_vault", true)
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
            {itineraries.map((route) => {
              // 🚨 EXTRAC TING THE THUMBNAIL PHOTO
              // We grab the first step's image_url if it exists.
              const thumbnailPhoto = route.full_json?.plan?.[0]?.image_url;

              return (
                <Link href={`/route/${route.id}`} key={route.id}>
                  <div className="border border-neutral-800 rounded-2xl bg-neutral-900 hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all group h-full flex flex-col cursor-pointer overflow-hidden">
                    {/* 🚨 THE NEW THUMBNAIL IMAGE BLOCK */}
                    {thumbnailPhoto ? (
                      <div className="w-full h-48 relative overflow-hidden">
                        <Image
                          src={thumbnailPhoto}
                          alt={`Thumbnail for ${route.title}`}
                          width={400} // Reserves layout space
                          height={200} // Reserves layout space
                          unoptimized={true} // Mandatory for external Google proxy links
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Gradient overlay for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent"></div>
                      </div>
                    ) : (
                      // Fallback if no photo found
                      <div className="w-full h-48 bg-neutral-800 flex items-center justify-center text-neutral-600">
                        No Photo
                      </div>
                    )}

                    {/* Card Content (Adjusted padding to p-5 for better fit) */}
                    <div className="p-5 flex-grow flex flex-col">
                      <h2 className="text-lg font-bold mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {route.title || "My Pathzu Route"}
                      </h2>

                      <div className="mt-auto pt-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-800">
                        <span className="px-3 py-1 bg-neutral-800 rounded-full truncate max-w-[150px]">
                          {route.vibe || "Custom Vibe"}
                        </span>
                        <span>
                          {new Date(route.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
