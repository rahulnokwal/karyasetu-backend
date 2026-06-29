import mongoose from "mongoose";
import ProjectMember from "../models/projectMember.js";
import Project from "../models/project.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { ProjectRoleEnum, UserRoleEnum, actionTypeEnum } from "../constant.js";
import WorkspaceMember from "../models/workspaceMember.models.js";
import Task from "../models/task.models.js";
import createAuditLog from "../utils/auditLogService.js";
import { deleteBulk } from "../utils/cloudinary.js";

const createProject = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    workspaceId,
    createdBy: req.user._id,
    description,
  });

  try {
    await ProjectMember.create({
      workspaceId,
      projectId: project._id,
      userId: project.createdBy,
      role: ProjectRoleEnum.PROJECT_ADMIN,
      joinedAt: Date.now(),
    });
  } catch (error) {
    await Project.findByIdAndDelete(project._id);
    throw new apiError(500, "Project creation failed", error);
  }

  createAuditLog({
    workspaceId: workspaceId,
    projectId: project._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.CREATED,
    changes: { action: `Project ${name} created` },
  });

  res
    .status(201)
    .json(new apiResponse(201, "Project created successfully", project));
});

const listProjects = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  let projects = [];
  if (
    req.workspaceRole === UserRoleEnum.OWNER ||
    req.workspaceRole === UserRoleEnum.ADMIN
  ) {
    projects = await Project.find({
      workspaceId,
    });
  } else {
    projects = await ProjectMember.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          userId: req.user._id,
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      {
        $project: {
          _id: "$projectDetails._id",
          name: "$projectDetails.name",
          description: "$projectDetails.description",
          createdBy: "$projectDetails.createdBy",
          myRoleInProject: "$role",
        },
      },
    ]);
  }
  res
    .status(200)
    .json(new apiResponse(200, "Projects fetched successfully", projects));
});

const getProjectDetails = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const projectDetails = await Project.findById(projectId);
  if (!projectDetails) {
    throw new apiError(404, "Project not found");
  }
  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Project details fetched successfully",
        projectDetails
      )
    );
});

const updateProjectDetails = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description } = req.body;

  if (!projectId) throw new apiError(400, "Project id is missing");

  const oldProject = await Project.findById(projectId);
  if (!oldProject) throw new apiError(404, "Project not found");

  const updateFields = {};
  const auditChanges = {};

  if (name && name !== oldProject.name) {
    updateFields.name = name;
    auditChanges.name = { from: oldProject.name, to: name };
  }
  if (description && description !== oldProject.description) {
    updateFields.description = description;
    auditChanges.description = {
      from: oldProject.description,
      to: description,
    };
  }

  if (Object.keys(updateFields).length == 0)
    throw new apiError(400, "No details provided to update");

  const updateDetails = await Project.findByIdAndUpdate(
    projectId,
    { $set: updateFields },
    { new: true }
  );
  if (!updateDetails)
    throw new apiError(500, "Something went wrong while updating details");

  createAuditLog({
    workspaceId: updateDetails.workspaceId,
    projectId: updateDetails._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.UPDATED,
    changes: auditChanges,
  });

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Project details updated successfully",
        updateDetails
      )
    );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) throw new apiError(400, "Project Id is missing");

  const projectTask = await Task.find({ projectId });
  const publicIds = projectTask.flatMap((task) =>
    task.attachments.map((file) => file.publicId)
  );
  await deleteBulk(publicIds);

  const project = await Project.findByIdAndDelete(projectId);
  if (!project) throw new apiError(404, "Project not found");

  createAuditLog({
    workspaceId: project.workspaceId,
    projectId: project._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.DELETED,
    changes: { action: `Project ${project.name} deleted` },
  });

  res.status(200).json(new apiResponse(200, "Project deleted successfully"));
});

const addProjectMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body;

  const user = await ProjectMember.findOne({ userId, projectId });
  if (user) throw new apiError(409, "User already exists");

  const workspace = await Project.findById(projectId);
  const workspaceMembeship = await WorkspaceMember.findOne({
    userId,
    workspaceId: workspace.workspaceId,
  });
  if (!workspaceMembeship)
    throw new apiError(404, "User does not have access to workspace");
  const projectMembership = await ProjectMember.create({
    workspaceId: workspaceMembeship.workspaceId,
    projectId,
    userId,
    role,
    joinedAt: Date.now(),
  });
  res
    .status(200)
    .json(
      new apiResponse(200, "Member addded successfully", projectMembership)
    );
});

const updateProjectMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;
  if (!projectId || !userId)
    throw new apiError(400, "Project Id or User Id is missing");

  if (!role) throw new apiError(400, "role is not defined");

  if (req.user._id.toString() === userId)
    throw new apiError(400, "Project admin role cannot be demoted");

  const member = await ProjectMember.findOneAndUpdate(
    { projectId, userId },
    { $set: { role: role } },
    { new: true, runValidators: true }
  );
  if (!member) throw new apiError(404, "Member not exist");

  res
    .status(200)
    .json(new apiResponse(200, "Project Member role updated", { member }));
});

const restrictProjectAccess = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  if (!projectId || !userId)
    throw new apiError(400, "Project Id or User Id is missing");

  const projectMembership = await ProjectMember.findOne({ projectId, userId });
  if (!projectMembership)
    throw new apiError(404, "User is not a Project Member");

  if (projectMembership.role === ProjectRoleEnum.PROJECT_ADMIN) {
    const projectAdminCount = await ProjectMember.countDocuments({
      projectId,
      role: ProjectRoleEnum.PROJECT_ADMIN,
    });

    if (projectAdminCount === 1)
      throw new apiError(
        400,
        "Cannot remove the last Project Admin. Please assign the role of Project Admin to someone else first."
      );
  }
  await ProjectMember.findByIdAndDelete(projectMembership._id);

  res
    .status(200)
    .json(new apiResponse(200, "User removed from Project Members"));
});

const listProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) throw new apiError(400, "Project Id is missing");

  const projectMembership = await ProjectMember.findOne({
    projectId,
    userId: req.user._id,
  });
  if (!projectMembership)
    throw new apiError(404, "User is not all to see Project Member");

  let projectMembers = await ProjectMember.find({ projectId })
    .populate("userId", "name email profile")
    .lean();
  projectMembers = projectMembers.map((membership) => ({
    ...membership.userId,
    role: membership.role,
  }));

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Project Members fetched successfully",
        projectMembers
      )
    );
});

export {
  createProject,
  listProjects,
  getProjectDetails,
  updateProjectDetails,
  deleteProject,
  addProjectMember,
  updateProjectMemberRole,
  restrictProjectAccess,
  listProjectMembers,
};
