import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const userAuth = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new apiError(401, "Unauthorized access: Token missing");

    const decoded_token = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded_token._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
    );
    if (!user)
      throw new apiError(401, "Unauthorized access: User does not exist");
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new apiError(401, "Access token has expired");
    }
    throw new apiError(401, error?.message || "Invalid access token");
  }
});

export default userAuth;
