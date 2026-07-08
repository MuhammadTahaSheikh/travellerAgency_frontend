import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: frontend + backend each have their own lockfile under this root.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
