import mongoose from "mongoose";
import crypto from "crypto";
import { AvailableUserRole, UserRoleEnum } from "../constant.js";

const workspaceMemberInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRoleEnum.VIEWER,
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emailInvitationToken: {
      type: String,
    },
    emailInvitationTokenExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

const WorkspaceMemberInvitation = mongoose.model(
  "WorkspaceMemberInvitation",
  workspaceMemberInvitationSchema
);

workspaceMemberInvitationSchema.methods.generateCryptoToken = () => {
  const unhashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");
  const tokenExpiry = Date.now() + 48 * 60 * 60 * 1000;

  return { unhashedToken, hashedToken, tokenExpiry };
};

export default WorkspaceMemberInvitation;
