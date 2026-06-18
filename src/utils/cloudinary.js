import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import apiError from "./apiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) throw new apiError(404, "file not found");

    const uploadedFile = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    if (!uploadedFile) throw new apiError(500, "Error uploading file");
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return uploadedFile;
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new apiError(500, error.message || "Error uploading file");
  }
};

export default uploadOnCloudinary;
