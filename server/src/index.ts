import mongoose from "mongoose";
import { config } from "./config";
import { createApp } from "./app";

async function main() {
  config.assertEnv();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");

  const app = createApp(config.corsOrigins);
  app.listen(config.port, () =>
    console.log(`API listening on port ${config.port}`),
  );
}

main().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
