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
  restrictWorkspaceAccess,
  leaveWorkspace,
} from "../controllers/workspace.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import validatePermissions from "../middleware/validatePermissions.js";
import { UserRoleEnum } from "../constant.js";
import validate from "../middleware/validator.middleware.js";
import { AvailableUserRole } from "../constant.js";
import { Rotate3D } from "lucide-react";

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
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    workspaceValidation(),
    validate,
    renameWorkspace
  );

router
  .route("/workspaces/:workspaceId/invites")
  .post(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    emailValidation(),
    validate,
    sendWorkspaceInvitation
  );

router.route("/invites-accept/:token").post(userAuth, acceptInvitation);

router
  .route("/workspaces/:workspaceId/members")
  .get(userAuth, validatePermissions(AvailableUserRole), listWorkspaceMember);

router
  .route("/workspaces/:workspaceId/members/:userId")
  .patch(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    modifyMemberRole
  );

router
  .route("/workspaces/:workspaceId/members/:userId")
  .delete(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    restrictWorkspaceAccess
  );

router
  .route("/workspaces/:workspaceId/leave")
  .delete(userAuth, validatePermissions(AvailableUserRole), leaveWorkspace);

export default router;
