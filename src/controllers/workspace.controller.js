import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Workspace from "../models/workspace.models.js";
import WorkspaceMember from "../models/workspaceMember.models.js";
import WorkspaceMemberInvitation from "../models/WorkspaceMembershipInvites.js";
import { UserRoleEnum } from "../constant.js";
import { sendEmailToUser, invitationMailTemplate } from "../utils/mail.js";

const createWorkspace = asyncHandler(async (req, res) => {
  const { workspaceName } = req.body;

  const workspace = new Workspace({
    workspaceName,
    createdBy: req.user._id,
  });

  await workspace.save();

  try {
    await WorkspaceMember.create({
      userId: req.user._id,
      workspaceId: workspace._id,
      joinedAt: Date.now(),
      role: UserRoleEnum.OWNER,
    });
  } catch (error) {
    await Workspace.findByIdAndDelete(workspace._id);
    throw new apiError(
      500,
      "Failed to initialize workspace owner. Please try again."
    );
  }

  res
    .status(201)
    .json(new apiResponse(201, "Workspace is created successfully", workspace));
});

const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = WorkspaceMember.aggregate([
    {
      $match: {
        userId: req.user._id,
      },
    },
    {
      $lookup: {
        from: "Workspace",
        localField: "userId",
        foreignField: "_id",
        as: "workspaces",
      },
    },
    { $first: "$workspaces" },
    {
      $project: {
        $id: "$workspaces._id",
        $workspaceName: "$workspaces.workspaceName",
        $createdBy: "$workspace.createdBy",
        $role: "$role",
        $joinedAt: "$joinedAt",
      },
    },
  ]);
  res.status(200).json(200, "Workspaces fetched successfully", workspaces);
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const workspaceDeletion = await Workspace.findByIdAndDelete(workspaceId);

  res
    .status(200)
    .json(new apiResponse(200, "Workspace and it data has been deleted"));
});

const renameWorkspace = asyncHandler(async (req, res) => {
  const { workspaceName } = req.body;
  const { workspaceId } = req.params;

  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    { workspaceName: workspaceName },
    { new: true }
  );
  if (!workspace) throw new apiError(404, "Workspace not found");
  res
    .status(200)
    .json(new apiResponse(200, "workspace renamed successfully", workspace));
});

const sendWorkspaceInvitation = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById({
    workspaceId,
  });
  if (!workspace) throw new apiError(404, "workspace not found");

  const userInvitation = new WorkspaceMemberInvitation({
    email,
    role,
    workspaceId,
    invitedBy: req.user._id,
  });

  const { unhashedToken, hashedToken, tokenExpiry } =
    userInvitation.generateCryptoToken();
  userInvitation.emailInvitationToken = hashedToken;
  userInvitation.emailInvitationTokenExpiry = tokenExpiry;

  await userInvitation.save();

  const options = {
    email: userInvitation.email,
    subject: "Invitation to join the workspace",
    mail: invitationMailTemplate(
      userInvitation.email,
      `${process.env.CLIENT_URL}/invitation-accept?token=${unhashedToken}`,
      req.user.fullName,
      workspace.workspaceName,
      userInvitation.role
    ),
  };

  const mailInvitation = await sendEmailToUser(options);
  if (!mailInvitation) {
    await WorkspaceMemberInvitation.findByIdAndDelete(userInvitation._id);
    throw new apiError(500, "something went wrong while inviting user");
  }

  const invitedUserData = userInvitation.toObject();
  delete userInvitation.emailInvitationToken;
  delete userInvitation.emailInvitationTokenExpiry;
  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Invitation email sent successfully",
        invitedUserData
      )
    );
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) throw new apiError(400, "Token is missing");

  if (!req.user.isEmailVerified)
    throw new apiError(
      403,
      "Please verify your email address before joining a workspace"
    );

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const invitationMember = await WorkspaceMemberInvitation.findOne({
    emailInvitationToken: hashedToken,
    emailInvitationTokenExpiry: { $gt: Date.now() },
  });
  if (!invitationMember)
    throw new apiError(400, "Tokens are invalid or expired");

  if (invitationMember.email !== req.user.email)
    throw new apiError(
      403,
      "This invitation was sent to a different email address"
    );

  const member = await WorkspaceMember.create({
    userId: req.user._id,
    workspaceId: invitationMember.workspaceId,
    joinedAt: Date.now(),
    role: invitationMember.role,
  });

  await WorkspaceMemberInvitation.findByIdAndDelete(invitationMember._id);
  res
    .status(200)
    .json(new apiResponse(200, "Successfully joined the workspace", member));
});

export {
  createWorkspace,
  listWorkspaces,
  deleteWorkspace,
  renameWorkspace,
  sendWorkspaceInvitation,
  acceptInvitation,
};
