import app from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`server is listening on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failure", error);
    process.exit(1);
  });
