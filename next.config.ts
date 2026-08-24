import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service role key must never reach the browser. Nothing in src/lib is
  // imported from a client component; this is the belt to that suspenders.
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
