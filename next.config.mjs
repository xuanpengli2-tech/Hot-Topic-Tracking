/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/Hot-Topic-Tracking",
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/Hot-Topic-Tracking"
  }
};

export default nextConfig;
