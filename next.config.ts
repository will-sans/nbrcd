// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;
//ここまでデフォルトのnext.config.tsファイル。修正でオールコメントアウト

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // dev時は無効でOK
})

const nextConfig = withPWA({
  reactStrictMode: true,
  //*swcMinify: true, //Next.js 15 では内部構造が変わり、もはや手動設定不要
})

module.exports = nextConfig
