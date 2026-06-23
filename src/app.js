import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";

const app = express();

//express configuration
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // change later
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan("dev")); //change

//routes
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userAuthRouter from "./routes/userAuth.routes.js";
import workspaceRouter from "./routes/workspace.routes.js";
import projectRouter from "./routes/project.routes.js";
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/user", userAuthRouter);
app.use("/api/v1/workspace", workspaceRouter);
workspaceRouter.use("/:workspaceId/project", projectRouter);
app.use("/api/v1/projects", projectRouter);

//global error handling
app.use((err, req, res, _) => {
  const statusCode = err.statuscode || 500;
  const errors = err.errors || [];
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    statusCode: statusCode,
    message: message,
    errors: errors,
  });
});
export default app;
