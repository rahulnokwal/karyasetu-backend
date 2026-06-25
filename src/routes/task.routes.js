import { Router } from "express";
import {
  createTask,
  listProjectTasks,
  getMyTasks,
  getTaskById,
} from "../controllers/task.controller.js";
import { createTaskValidation } from "../validators/index.js";
import userAuth from "../middleware/userAuth.middleware.js";
import { validateProjectPermissions } from "../middleware/validatePermissions.js";
import validate from "../middleware/validator.middleware.js";
import { AvailableProjectRoles, ProjectRoleEnum } from "../constant.js";
import { uploadTaskNotes } from "../middleware/multer.middleware.js";
const router = Router();
router
  .route("/:projectId/tasks")
  .post(
    userAuth,
    validateProjectPermissions([
      ProjectRoleEnum.PROJECT_ADMIN,
      ProjectRoleEnum.EDITOR,
    ]),
    uploadTaskNotes.array("uploadFiles", 3),
    createTaskValidation(),
    validate,
    createTask
  );

router
  .route("/:projectId/tasks")
  .get(
    userAuth,
    validateProjectPermissions(AvailableProjectRoles),
    listProjectTasks
  );

router.route("/my-tasks").get(userAuth, getMyTasks);

router.route("/:taskId").get(userAuth, getTaskById);

export default router;
