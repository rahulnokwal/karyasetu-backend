import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
const connectDB = async () => {
  try {
    const mongoConnectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failure", error);
    process.exit(1);
  }
};

export default connectDB;
