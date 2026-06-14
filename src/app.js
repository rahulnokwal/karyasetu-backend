import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import apiError from "./utils/apiError.js";

const app = express();

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

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res
    .status(statusCode)
    .json(new apiError(statusCode, err.message || "Internal Server Error"));
});

export default app;
