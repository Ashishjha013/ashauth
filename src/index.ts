import { createServer } from "node:http";
import "dotenv/config";
import createApplication from "./app/app.js";

const startServer = async () => {
  const server = createServer(createApplication());
  const PORT = process?.env?.PORT;
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
