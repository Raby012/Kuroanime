/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@consumet/extensions",
    "got-scraping",
    "got-scraping-wrapper",
    "got",
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client: replace with false (empty module)
      config.resolve.alias = {
        ...config.resolve.alias,
        "@consumet/extensions": false,
        "got-scraping": false,
        "got-scraping-wrapper": false,
        "got": false,
      };
    } else {
      // Server: tell webpack NOT to bundle these at all
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
