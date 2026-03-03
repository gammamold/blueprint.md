import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

/**
 * OAuth callback handler.
 * Supabase redirects here after GitHub sign-in with a code in the URL hash.
 * We let Supabase exchange it for a session, then redirect to the marketplace.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase JS client auto-detects the hash fragment and exchanges the code
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/");
      }
    });

    // Fallback: if already signed in or exchange completes instantly
    const timeout = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16
    }}>
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>
        SIGNING IN...
      </div>
    </div>
  );
}
