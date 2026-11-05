import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the bundled sample PDFs (used by the public landing-page demo)
  // are included in the serverless function output on hosts like Vercel,
  // where only explicitly-traced files outside the route's own folder are
  // packaged. Without this, /api/files/samples/[filename] 404s in
  // production even though the files exist in the repo.
  outputFileTracingIncludes: {
    "/api/files/samples/[filename]": ["./storage/samples/**"],
  },
};

export default nextConfig;
