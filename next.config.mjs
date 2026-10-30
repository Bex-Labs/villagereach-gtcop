/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic security headers on every page
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops other websites from showing our pages inside a frame (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Browsers must not guess file types
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send our site name, not full addresses, to other websites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;