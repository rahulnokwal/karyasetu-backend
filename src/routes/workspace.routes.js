import { Router } from "express";
import { workspaceValidation, emailValidation } from "../validators/index.js";
import {
  createWorkspace,
  listWorkspaces,
  deleteWorkspace,
  renameWorkspace,
  sendWorkspaceInvitation,
  acceptInvitation,
  listWorkspaceMember,
  modifyMemberRole,
} from "../controllers/workspace.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import validatePermissions from "../middleware/validatePermissions.js";
import { UserRoleEnum } from "../constant.js";
import validate from "../middleware/validator.middleware.js";
import { AvailableUserRole } from "../constant.js";

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

router.route("/invites-accept/:token").post(userAuth, acceptInvitation);

router
  .route("/workspaces/:workspaceId/members")
  .get(userAuth, validatePermissions(AvailableUserRole), listWorkspaceMember);

router
  .route("")
  .patch(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    modifyMemberRole
  );
export default router;
