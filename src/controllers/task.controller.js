import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import Project from "../models/project.models.js";
import Task from "../models/task.models.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import ProjectMember from "../models/projectMember.js";
import { use } from "react";

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;

  if (!projectId) throw new apiError(400, "Project Id is missing");

  const project = await Project.findOne({ _id: projectId });
  if (!project) throw new apiError(404, "Project not found");

  const task = new Task({
    title,
    description,
    projectId,
    workspaceId: project.workspaceId,
    createdBy: req.user._id,
  });

  try {
    if (req.files) {
      task.attachments = [];
      const files = req.files;
      for (let file of files) {
        const uploadedFile = await uploadOnCloudinary(file.path);
        task.attachments.push({
          url: uploadedFile.url,
          publicId: uploadedFile.publicId,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        });
      }
    }
  } catch (error) {
    for (let file of task.attachments) {
      await deleteOnCloudinary(file.publicId);
    }
    throw new apiError(500, "File uploadation fails");
  }

  const createdTask = await task.save();
  res
    .status(200)
    .json(new apiResponse(200, "Task created successfully", createdTask));
});

const listProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  if (!projectId) throw new apiError(400, "Project Id is missing");

  const [tasks, totalDocument] = await Promise.all([
    Task.find({ projectId })
      .sort({ status: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "fullName email profile")
      .lean(),

    Task.countDocuments({ projectId }),
  ]);
  const totalPage = Math.ceil(totalDocument / limit);
  res.status(200).json(
    new apiResponse(200, "Project Tasks fetched successfully", {
      tasks,
      totalDocument,
      totalPage,
      currentPage: page,
      hasNextPage: page < totalPage,
      hasPreviousPage: page > 1,
    })
  );
});

const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({
    assigneeId: req.user._id,
  })
    .lean()
    .populate("createdBy", "name email profile")
    .populate("projectId", "name");

  if (tasks.length === 0) {
    return res
      .status(200)
      .json(
        new apiResponse(200, "You have no tasks assigned to you right now.", [])
      );
  }
  res
    .status(200)
    .json(new apiResponse(200, "Your tasks fetched successfully", tasks));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  if (!taskId) throw new apiError(400, "Task Id is missing");

  const task = await Task.findOne({
    _id: taskId,
  })
    .lean()
    .populate("createdBy", "name email profile")
    .populate("projectId", "name");

  if (!task) throw new apiError(404, "Task not found");

  const projectMember = ProjectMember.findOne({
    userId: req.user._id,
    projectId: task.projectId,
  });
  if (!projectMember)
    throw new apiError(403, "You are not allowed to view task");

  res.status(200).json(new apiResponse(200, "Task fetched successfully", task));
});

const updateTaskInfo = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description } = req.body;
  if (!projectId || !taskId)
    throw new apiError(400, "Project Id or Task Id is missing");

  const updateFields = {};
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;

  const attachments = [];
  try {
    if (req.files) {
      const uploadFiles = req.files;
      for (let file of uploadFiles) {
        const uploadedFile = await uploadOnCloudinary(file.path);
        attachments.push({
          url: uploadedFile.url,
          publicId: uploadedFile.publicId,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        });
      }
    }
  } catch (error) {
    for (let file of attachments) {
      await deleteOnCloudinary(file.publicId);
    }
    throw new apiError(500, "File uploadation fails");
  }
  if (Object.keys(updateFields).length == 0 && attachments.length == 0)
    throw new apiError(400, "No details provided to update");

  const query = { $set: updateFields };
  if (attachments.length > 0)
    query.$push = { attachments: { $each: attachments } };

  const updatedTask = await Task.findOneAndUpdate(
    { _id: taskId, projectId: projectId },
    query,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedTask)
    throw new apiError(500, "something went wrong while updating task");
  res
    .status(200)
    .json(
      new apiResponse(200, "Task details updated successfully", updatedTask)
    );
});

const assignTask = asyncHandler(async (req, res) => {
  const { assigneeId } = req.body;
  const { projectId, taskId } = req.params;
  if (!assigneeId || !taskId || !projectId)
    throw new apiError(400, "Project Id, Task Id, or Assignee Id is missing");

  const task = await Task.findOne({
    _id: taskId,
    projectId,
  });
  if (!task) throw new apiError(400, "Task Id does not exits in this Project");

  const projectMember = await ProjectMember.findOne({
    userId: assigneeId,
    projectId: projectId,
  });
  if (!projectMember)
    throw new apiError(
      403,
      "User whom you are assigning the task is not an Project Member"
    );

  task.assigneeId = assigneeId;
  await task.save();

  res
    .status(200)
    .json(new apiResponse(200, "Task is assigned successfully", task));
});

const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { taskId } = req.params;
  if (!status) throw new apiError(400, "Status is required");
  if (!taskId) throw new apiError(400, "Task Id is missing");

  const task = await Task.findOne({
    _id: taskId,
  });
  if (!task) throw new apiError(404, "Task not found");

  if (task.assigneeId.toString() !== req.user._id.toString())
    throw new apiError("403", "You are not authorized to changed Task Status");

  task.status = status;
  await task.save();
  await task.populate([
    { path: "projectId", select: "name description" },
    { path: "createdBy", select: "fullName email profile" },
  ]);
  res
    .status(200)
    .json(new apiResponse(200, "Task Status changed successfully", task));
});

export {
  createTask,
  listProjectTasks,
  getMyTasks,
  getTaskById,
  updateTaskInfo,
  assignTask,
  changeStatus,
};
