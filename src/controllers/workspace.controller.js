import mongoose from "mongoose";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Workspace from "../models/workspace.models.js";
import WorkspaceMember from "../models/workspaceMember.models.js";
import WorkspaceMemberInvitation from "../models/WorkspaceMembershipInvites.js";
import { UserRoleEnum, actionTypeEnum } from "../constant.js";
import { sendEmailToUser, invitationMailTemplate } from "../utils/mail.js";
import { deleteBulk } from "../utils/cloudinary.js";
import Task from "../models/task.models.js";
import createAuditLog from "../utils/auditLogService.js";

const createWorkspace = asyncHandler(async (req, res) => {
  const { workspaceName } = req.body;

  const workspace = new Workspace({
    workspaceName,
    createdBy: req.user._id,
    owner: req.user._id,
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
      "Failed to initialize workspace owner. Please try again.",
      error
    );
  }

  createAuditLog({
    workspaceId: workspace._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.CREATED,
    changes: { action: `${workspaceName} workspace created` },
  });

  res
    .status(201)
    .json(new apiResponse(201, "Workspace is created successfully", workspace));
});

const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = WorkspaceMember.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "workspaces",
        localField: "userId",
        foreignField: "_id",
        as: "workspaces",
      },
    },
    { $unwind: "$workspaces" },
    {
      $project: {
        id: "$workspaces._id",
        workspaceName: "$workspaces.workspaceName",
        createdBy: "$workspace.createdBy",
        owner: "$workspace.owner",
        role: "$role",
        joinedAt: "$joinedAt",
      },
    },
  ]);
  res.status(200).json(200, "Workspaces fetched successfully", workspaces);
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  if (!workspaceId) throw new apiError(400, "Workspace ID is missing");
  const workspaceTask = await Task.find({ workspaceId: workspaceId }).lean();
  const publicIds = workspaceTask.flatMap((task) =>
    task.attachments.map((file) => file.publicId)
  );
  await deleteBulk(publicIds);

  await Workspace.findByIdAndDelete(workspaceId);

  res
    .status(200)
    .json(new apiResponse(200, "Workspace and it data has been deleted"));
});

const renameWorkspace = asyncHandler(async (req, res) => {
  const { workspaceName } = req.body;
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new apiError(404, "Workspace not found");

  const oldName = workspace.workspaceName;
  workspace.workspaceName = workspaceName;
  const renamedWorkspace = await workspace.save();

  const changes = { name: { from: oldName, to: workspaceName } };

  createAuditLog({
    workspaceId,
    performedBy: req.user._id,
    actionType: actionTypeEnum.UPDATED,
    changes,
  });
  res
    .status(200)
    .json(
      new apiResponse(200, "workspace renamed successfully", renamedWorkspace)
    );
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

const listWorkspaceMember = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  let members = await WorkspaceMember.find({
    workspaceId,
  })
    .populate("userId", "fullName email profile")
    .lean();
  members = members.map((membership) => ({
    ...membership.userId,
    role: membership.role,
  }));

  res
    .status(200)
    .json(new apiResponse(200, "Members fetched successfully", members));
});

const modifyMemberRole = asyncHandler(async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;

  if (req.user._id.toString() === userId)
    throw new apiError(400, "You cannot modify your own role");

  if (role == UserRoleEnum.OWNER)
    throw new apiError(
      403,
      "The OWNER role cannot be assigned through this endpoint"
    );

  const member = await WorkspaceMember.findOneAndUpdate(
    {
      workspaceId,
      userId,
    },
    { $set: { role: role } },
    { new: true, runValidators: true }
  ).populate("userId", "fullName email");
  if (!member) throw new apiError(404, "Member not found");
  res
    .status(200)
    .json(new apiResponse(200, "Member role update successfully", member));
});

const transferOwnershipAccess = asyncHandler(async (req, res) => {
  const { workspaceId, userId } = req.params;
  if (!workspaceId || !userId)
    throw new apiError(400, "Workspace ID and Target User ID are required.");

  const targetMember = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!targetMember) {
    throw new apiError(404, "Target user not found.");
  }
  const currentMember = await WorkspaceMember.findOne({
    workspaceId,
    userId: req.user._id,
  });
  targetMember.role = UserRoleEnum.OWNER;
  currentMember.role = UserRoleEnum.ADMIN;

  await Promise.all([currentMember.save(), targetMember.save()]);

  Workspace.findByIdAndUpdate(workspaceId, {
    $set: { owner: userId },
  });

  res.status(200).json(
    new apiResponse(200, "OWNER role is transfered successfully", {
      newOwner: targetMember.userId,
    })
  );
});

const restrictWorkspaceAccess = asyncHandler(async (req, res) => {
  const { workspaceId, userId } = req.params;

  if (userId == req.user._id.toString())
    throw new apiError(400, "You cannot remove yourself from workspace");

  const member = await WorkspaceMember.findOne({
    workspaceId,
    userId,
  });
  if (!member) throw new apiError(404, "Member not found");
  if (member.role === UserRoleEnum.OWNER)
    throw new apiError(
      403,
      "You cannot restrict OWNER to have access of workspace"
    );

  await WorkspaceMember.findByIdAndDelete(member._id);

  res
    .status(200)
    .json(new apiResponse(200, "Member role removed successfully"));
});

const leaveWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const member = await WorkspaceMember.findOne({
    workspaceId,
    userId: req.user._id,
  });
  if (!member) throw new apiError(400, "You doesn't have access to workspace");
  if (member.role === UserRoleEnum.OWNER)
    throw new apiError(
      400,
      "Workspace Owner cannot leave. Please transfer ownership or delete the workspace entirely."
    );

  await WorkspaceMember.findByIdAndDelete(member._id);
  res.status(200).json(new apiResponse(200, "removed successfully"));
});

export {
  createWorkspace,
  listWorkspaces,
  deleteWorkspace,
  renameWorkspace,
  sendWorkspaceInvitation,
  acceptInvitation,
  listWorkspaceMember,
  modifyMemberRole,
  transferOwnershipAccess,
  restrictWorkspaceAccess,
  leaveWorkspace,
};
