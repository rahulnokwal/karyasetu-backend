import { Router } from "express";
import { projectValidation } from "../validators/index.js";
import { createProject } from "../controllers/project.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import validatePermissions from "../middleware/validatePermissions.js";
import validate from "../middleware/validator.middleware.js";
import { UserRoleEnum } from "../constant.js";

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
export default router;
