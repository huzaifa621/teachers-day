/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone — a minimal server bundle with only the
  // dependencies actually used, so the Docker image doesn't need the full
  // node_modules tree in its final stage.
  output: 'standalone'
};

module.exports = nextConfig;
