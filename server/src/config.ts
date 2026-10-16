import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  get port() {
    return Number(process.env.PORT ?? 4000);
  },
  get mongoUri() {
    return required("MONGODB_URI");
  },
  get jwtSecret() {
    return required("JWT_SECRET");
  },
  get corsOrigins() {
    return (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  assertEnv() {
    required("MONGODB_URI");
    required("JWT_SECRET");
  },
};
