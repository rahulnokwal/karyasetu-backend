import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import Project from "../models/project.models.js";
import Task from "../models/task.models.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import ProjectMember from "../models/projectMember.js";
import { actionTypeEnum, TaskStatusEnum } from "../constant.js";
import { lexicalOrdering } from "../utils/lexicalOrdering.js";
import createAuditLog from "../utils/auditLogService.js";

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;

  if (!projectId) throw new apiError(400, "Project Id is missing");

  const project = await Project.findOne({ _id: projectId });
  if (!project) throw new apiError(404, "Project not found");

  const lastTask = await Task.findOne({ projectId, status: "TODO" }).sort({
    lexicalOrder: -1,
  });
  const position = lexicalOrdering.calculatePosition(lastTask?.position, "");

  const task = new Task({
    title,
    description,
    projectId,
    workspaceId: project.workspaceId,
    createdBy: req.user._id,
    lexicalOrder: position,
  });

  try {
    if (req.files) {
      task.attachments = [];
      const files = req.files;
      for (const file of files) {
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
    for (const file of task.attachments) {
      await deleteOnCloudinary(file.publicId);
    }
    throw new apiError(500, "File uploadation fails", error);
  }

  const createdTask = await task.save();

  createAuditLog({
    workspaceId: createdTask.workspaceId,
    projectId: createdTask.projectId,
    taskId: createdTask._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.CREATED,
    changes: { action: `Task ${createdTask._id} created` },
  });

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
    Task.find({ projectId, status: { $ne: TaskStatusEnum.CANCELLED } })
      .sort({ lexicalOrder: 1 })
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
    status: { $ne: TaskStatusEnum.CANCELLED },
  })
    .sort({ lexicalOrder: 1 })
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

  const oldTask = await Task.findOne({
    _id: taskId,
    projectId,
  }).lean();
  if (!oldTask) throw new apiError(404, "Task not found");

  const updateFields = {};
  const auditChanges = {};

  if (title && title !== oldTask.title) {
    updateFields.title = title;
    auditChanges.title = { from: oldTask.title, to: title };
  }
  if (description && description !== oldTask.description) {
    updateFields.description = description;
    auditChanges.description = { from: oldTask.description, to: description };
  }

  const attachments = [];
  try {
    if (req.files) {
      const uploadFiles = req.files;
      for (const file of uploadFiles) {
        const uploadedFile = await uploadOnCloudinary(file.path);
        attachments.push({
          url: uploadedFile.url,
          publicId: uploadedFile.publicId,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        });
      }
      auditChanges.attachments = {
        action: `Added ${attachments.length} new file(s)`,
      };
    }
  } catch (error) {
    for (const file of attachments) {
      await deleteOnCloudinary(file.publicId);
    }
    throw new apiError(500, "File uploadation fails", error);
  }
  if (Object.keys(updateFields).length == 0 && attachments.length == 0)
    throw new apiError(400, "No details provided to update");

  const query = { $set: updateFields };
  if (attachments.length > 0)
    query.$push = { attachments: { $each: attachments } };

  const updatedTask = await Task.findByIdAndUpdate(taskId, query, {
    new: true,
    runValidators: true,
  });
  if (!updatedTask)
    throw new apiError(500, "something went wrong while updating task");

  createAuditLog({
    workspaceId: updatedTask.workspaceId,
    projectId: updatedTask.projectId,
    taskId: updatedTask._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.UPDATED,
    changes: auditChanges,
  });

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
  if (status === TaskStatusEnum.CANCELLED)
    throw new apiError(
      400,
      "You are not allowed to CANCEL TASK. ask project owner or admin to do so"
    );
  const task = await Task.findOne({
    _id: taskId,
  });
  if (!task) throw new apiError(404, "Task not found");
  if (!task.assigneeId)
    throw new apiError(
      400,
      "Task is not assigned to anyone. to change the status you must assign task to user first"
    );
  if (task.assigneeId.toString() !== req.user._id.toString())
    throw new apiError(403, "You are not authorized to changed Task Status");

  const oldStatus = task.status;
  task.status = status;
  await task.save();

  createAuditLog({
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    taskId: task._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.UPDATED,
    changes: { status: { from: oldStatus, to: task.status } },
  });

  res
    .status(200)
    .json(new apiResponse(200, "Task Status changed successfully", task));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  if (!projectId || !taskId)
    throw new apiError(400, "Project Id or Task Id is missing");

  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) throw new apiError(404, "Task not found");
  task.status = TaskStatusEnum.CANCELLED;
  await task.save();

  createAuditLog({
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    taskId: task._id,
    performedBy: req.user._id,
    actionType: actionTypeEnum.CANCELLED,
    changes: { action: `Task ${taskId} deleted` },
  });

  res.status(200).json(new apiResponse(200, "Task has been CANCELLED"));
});

const reorderTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { prevPosition = "", nextPosition = "" } = req.body;

  if (!projectId || !taskId) {
    throw new apiError(400, "Project ID and Task ID are required");
  }

  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) throw new apiError(404, "Task not found");

  const newPosition = lexicalOrdering.calculatePosition(
    prevPosition,
    nextPosition
  );

  task.lexicalOrder = newPosition;
  await task.save();

  res.status(200).json(
    new apiResponse(200, "Task reordered successfully", {
      position: newPosition,
    })
  );
});

export {
  createTask,
  listProjectTasks,
  getMyTasks,
  getTaskById,
  updateTaskInfo,
  assignTask,
  changeStatus,
  deleteTask,
  reorderTask,
};
