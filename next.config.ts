import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Local monorepo only — Vercel clones the frontend repo without a parent folder.
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(process.cwd(), "..") }),
};

export default nextConfig;
