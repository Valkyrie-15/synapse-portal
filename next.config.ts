import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle private documents with the route that serves them (needed on Vercel / standalone builds)
  outputFileTracingIncludes: {
    "/api/files/[...path]": ["./storage/documents/**/*"],
  },
};

export default nextConfig;
