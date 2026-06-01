/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@consumet/extensions",
      "got-scraping",
      "got-scraping-wrapper",
      "got",
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@consumet/extensions": false,
        "got-scraping": false,
        "got-scraping-wrapper": false,
        "got": false,
      };
    } else {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@consumet/extensions",
        "got-scraping",
        "got-scraping-wrapper",
        "got",
      ];
    }
    return config;
  },

  images: {
    qualities: [75, 85, 90, 95, 100],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 144, 176, 208, 256],
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img.anili.st" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
