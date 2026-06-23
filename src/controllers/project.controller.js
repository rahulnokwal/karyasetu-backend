import ProjectMember from "../models/projectMember.js";
import Project from "../models/project.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { ProjectRoleEnum, UserRoleEnum } from "../constant.js";

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

  const updateFeilds = {};
  if (name) updateFeilds.name = name;
  if (description) updateFeilds.description = description;

  if (Object.keys(updateFeilds).length == 0)
    throw new apiError(400, "No details provided to update");

  const updateDetails = await Project.findByIdAndUpdate(
    projectId,
    { $set: updateFeilds },
    { new: true }
  );
  if (!updateDetails)
    throw new apiError(500, "Something went wrong while updating details");

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

export { createProject, listProjects, getProjectDetails, updateProjectDetails };
