import { Router } from "express";
import { workspaceValidation, emailValidation } from "../validators/index.js";
import {
  createWorkspace,
  listWorkspaces,
  deleteWorkspace,
  renameWorkspace,
  sendWorkspaceInvitation,
} from "../controllers/workspace.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import validatePermissions from "../middleware/validatePermissions.js";
import { UserRoleEnum } from "../constant.js";
import validate from "../middleware/validator.middleware.js";

const router = Router();
router
  .route("/workspaces")
  .post(userAuth, workspaceValidation(), validate, createWorkspace);
router.route("/workspaces").get(userAuth, listWorkspaces);
router
  .route("/workspaces/:workspaceId")
  .delete(userAuth, validatePermissions([UserRoleEnum.OWNER]), deleteWorkspace);
router
  .route("/workspaces/:workspaceId")
  .patch(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.PROJECT_ADMIN]),
    workspaceValidation(),
    validate,
    renameWorkspace
  );

router
  .route("/workspaces/:workspaceId/invites")
  .post(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.PROJECT_ADMIN]),
    emailValidation(),
    validate,
    sendWorkspaceInvitation
  );

export default router;
