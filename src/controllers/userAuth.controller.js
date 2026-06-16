import User from "../models/user.models.js";
import Workspace from "../models/workspace.models.js";
import WorkspaceMember from "../models/workspaceMember.models.js";
import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendEmailToUser,
  emailVerificationMailTemplate,
} from "../utils/mail.js";
import { UserRoleEnum } from "../constant.js";

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

export { registerUser };
