import { createServer } from "node:http";
import "dotenv/config";
import createApplication from "./app/app.js";

const startServer = async () => {
  const server = createServer(createApplication());
  const PORT = Number(process.env.PORT) || 8080;

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
