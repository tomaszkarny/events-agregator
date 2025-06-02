/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@events-agregator/shared", "@events-agregator/database"],
}

export default nextConfig