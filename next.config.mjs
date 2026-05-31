/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@consumet/extensions",
    "got-scraping-wrapper",
    "got-scraping",
  ],
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
