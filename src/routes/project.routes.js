import { Router } from "express";
import {
  projectValidation,
  projectUpdateValidation,
} from "../validators/index.js";
import {
  createProject,
  listProjects,
  getProjectDetails,
  updateProjectDetails,
  deleteProject,
  addProjectMember,
  updateProjectMemberRole,
} from "../controllers/project.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import {
  validatePermissions,
  validateProjectPermissions,
} from "../middleware/validatePermissions.js";
import validate from "../middleware/validator.middleware.js";
import {
  UserRoleEnum,
  AvailableUserRole,
  AvailableProjectRoles,
  ProjectRoleEnum,
} from "../constant.js";

const router = Router({ mergeParams: true });
router
  .route("/")
  .post(
    userAuth,
    validatePermissions([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]),
    projectValidation(),
    validate,
    createProject
  );

router
  .route("/")
  .get(userAuth, validatePermissions(AvailableUserRole), listProjects);

router
  .route("/:projectId")
  .get(
    userAuth,
    validateProjectPermissions(AvailableProjectRoles),
    getProjectDetails
  );

router
  .route("/:projectId")
  .patch(
    userAuth,
    validateProjectPermissions([
      ProjectRoleEnum.PROJECT_ADMIN,
      ProjectRoleEnum.EDITOR,
    ]),
    projectUpdateValidation(),
    validate,
    updateProjectDetails
  );

router
  .route("/:projectId")
  .delete(
    userAuth,
    validateProjectPermissions([ProjectRoleEnum.PROJECT_ADMIN]),
    deleteProject
  );

router
  .route("/:projectId/members")
  .post(
    userAuth,
    validateProjectPermissions([ProjectRoleEnum.PROJECT_ADMIN]),
    addProjectMember
  );

router
  .route("/:projectId/members/:userId")
  .patch(
    userAuth,
    validateProjectPermissions([ProjectRoleEnum.PROJECT_ADMIN]),
    updateProjectMemberRole
  );
export default router;
