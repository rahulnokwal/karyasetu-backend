import User from "../models/user.models.js";
import Workspace from "../models/workspace.models.js";
import WorkspaceMember from "../models/workspaceMember.models.js";
import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendEmailToUser,
  emailVerificationMailTemplate,
  forgetPasswordMailTemplate,
} from "../utils/mail.js";
import { UserRoleEnum } from "../constant.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import validate from "../middleware/validator.middleware.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

const generateAccessAndRefreshTokens = async (user) => {
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, mobileNumber } = req.body;

  const userAlreadyExist = await User.findOne({ email });
  if (userAlreadyExist) throw new apiError(409, "User already exists");

  const user = new User({
    fullName,
    email,
    password,
    mobileNumber,
  });

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);
  user.refreshToken = refreshToken;

  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateCryptoToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  const newUser = await user.save();
  if (!newUser)
    throw new apiError(500, "Something went wrong while saving the user!");

  await sendEmailToUser({
    email: newUser.email,
    subject: "Verify your mail",
    mail: emailVerificationMailTemplate(
      newUser.fullName,
      `${process.env.CLIENT_URL}/verify-email?token=${unhashedToken}`
    ),
  });

  const firstName = newUser.fullName.split(" ")[0];

  const userWorkspace = await Workspace.create({
    workspaceName: `${firstName}'s Workspace`,
    createdBy: newUser._id,
  });

  await WorkspaceMember.create({
    userId: newUser._id,
    workspaceId: userWorkspace._id,
    role: UserRoleEnum.OWNER,
  });

  const savedUser = newUser.toObject();
  delete savedUser.password;
  delete savedUser.refreshToken;
  delete savedUser.emailVerificationToken;
  delete savedUser.emailVerificationTokenExpiry;

  res
    .status(201)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new apiResponse(201, "User registered successfully", savedUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new apiError(401, "Invalid email or password");

  const isPasswordCorrect = await user.verifyPassword(password);
  if (!isPasswordCorrect) throw new apiError(401, "Invalid email or password");

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  const loggedInUser = user.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;
  delete loggedInUser.emailVerificationToken;
  delete loggedInUser.emailVerificationTokenExpiry;

  res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new apiResponse(200, "User logged in successfully", {
        user: loggedInUser,
        accessToken: accessToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );
  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new apiResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new apiError(401, "Unauthorized access: Token missing");

  try {
    const decoded_token = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded_token._id);
    if (!user)
      throw new apiError(401, "Unauthorized access: User does not exist");

    if (token !== user.refreshToken)
      throw new apiError(401, "Refresh token is expired or has been revoked");

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const currentUser = user.toObject();
    delete currentUser.password;
    delete currentUser.refreshToken;
    delete currentUser.emailVerificationToken;
    delete currentUser.emailVerificationTokenExpiry;

    res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new apiResponse(200, "Tokens refreshed", {
          user: currentUser,
          accessToken: accessToken,
        })
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new apiResponse(200, "Fetched User successfully", req.user));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new apiError(404, "User not found");

  const isPasswordCorrect = await user.verifyPassword(oldPassword);
  if (!isPasswordCorrect) throw new apiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res.status(200).json(new apiResponse(200, "Password changed successfully"));
});

const verifyEmailAddress = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new apiError(400, "Verification token is missing");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new apiError(
      400,
      "Email verification token is invalid or has expired"
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new apiResponse(200, "Email verified successfully", {
      isEmailVerified: true,
    })
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new apiError(404, "User not found");

  if (user.isEmailVerified)
    throw new apiError(409, "Email is already verified");

  if (user.emailVerificationTokenExpiry) {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const twoMinuteCooldown = 2 * 60 * 1000;

    const freshExpiryTime = Date.now() + twentyFourHours;
    const cooldownThreshold = freshExpiryTime - twoMinuteCooldown;
    if (user.emailVerificationTokenExpiry > cooldownThreshold) {
      throw new apiError(
        429,
        "Please wait 2 minutes before requesting another email."
      );
    }
  }

  const { hashedToken, unhashedToken, tokenExpiry } =
    await user.generateCryptoToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmailToUser({
    email: user.email,
    subject: "Verify  your mail",
    mail: emailVerificationMailTemplate(
      user.fullName,
      `${process.env.CLIENT_URL}/verify-email?token=${unhashedToken}`
    ),
  });

  res
    .status(200)
    .json(new apiResponse(200, "Verification email sent successfully"));
});

const sendForgetPasswordMail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          "If user exists, a password reset mail has been sent."
        )
      );

  if (user.forgetPasswordTokenExpiry) {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const twoMinuteCooldown = 2 * 60 * 1000;

    const freshExpiryTime = Date.now() + twentyFourHours;
    const cooldownThreshold = freshExpiryTime - twoMinuteCooldown;
    if (user.forgetPasswordTokenExpiry > cooldownThreshold) {
      throw new apiError(
        429,
        "Please wait 2 minutes before requesting another email."
      );
    }
  }

  const { hashedToken, unhashedToken, tokenExpiry } =
    await user.generateCryptoToken();
  user.forgetPasswordToken = hashedToken;
  user.forgetPasswordTokenExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmailToUser({
    email: email,
    subject: "Reset your password",
    mail: forgetPasswordMailTemplate(
      user.fullName,
      `${process.env.CLIENT_URL}/reset-password?token=${unhashedToken}`
    ),
  });

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "If user exists, a password reset mail has been sent."
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { passwordToken } = req.params;
  const { newPassword } = req.body;
  if (!passwordToken) throw new apiError(400, "Password token is missing");

  const hashedToken = crypto
    .createHash("sha256")
    .update(passwordToken)
    .digest("hex");

  const user = await User.findOne({
    forgetPasswordToken: hashedToken,
    forgetPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new apiError(400, "Invalid password token");

  user.password = newPassword;
  user.forgetPasswordToken = undefined;
  user.forgetPasswordTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new apiResponse(200, "Password reset successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  const file = await uploadOnCloudinary(filePath);
  if (!file) throw new apiError(500, "Error uploading file");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { profile: file.url } },
    { new: true }
  ).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
  );

  res
    .status(200)
    .json(new apiResponse(200, "Profile updated successfully", user));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email, mobileNumber } = req.body;

  const updateFields = {};
  if (fullName) updateFields.fullName = fullName;
  if (mobileNumber) updateFields.mobileNumber = mobileNumber;

  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new apiError(400, "This email is already in use.");
    }
    updateFields.email = email;
    updateFields.isEmailVerified = false;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new apiError(400, "No details provided to update.");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select(
    "-password -emailVerificationToken -emailVerificationTokenExpiry -refreshToken"
  );

  if (!user)
    throw new apiError(500, "Something went wrong while updating details.");

  res
    .status(200)
    .json(new apiResponse(200, "User details updated successfully", user));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  verifyEmailAddress,
  resendEmailVerification,
  sendForgetPasswordMail,
  resetPassword,
  updateUserProfile,
  updateUserDetails,
};
