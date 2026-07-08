/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output → kleine, zelfstandige server voor container-deploy
  // (AWS App Runner / ECS Fargate / Amplify in eu-west-1 Ierland).
  output: "standalone",
};

export default nextConfig;
