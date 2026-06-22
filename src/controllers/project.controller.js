import ProjectMember from "../models/projectMember.js";
import Project from "../models/project.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { ProjectRoleEnum } from "../constant.js";
import Workspace from "../models/workspace.models.js";

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
    const projectMember = await ProjectMember.create({
      workspaceId,
      projectId: project._id,
      userId: project.createdBy,
      role: ProjectRoleEnum.PROJECT_ADMIN,
      joinedAt: Date.now(),
    });
  } catch (error) {
    await Project.findByIdAndDelete(project._id);
    throw new apiError(500, "Project creation failed");
  }

  res
    .status(201)
    .json(new apiResponse(201, "Project created successfully", project));
});

export { createProject };
