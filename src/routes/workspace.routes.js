import { Router } from "express";
import { workspaceValidation } from "../validators/index.js";
import { createWorkspace } from "../controllers/workspace.controller.js";
import validator from "../middleware/validator.middleware.js";
import userAuth from "../middleware/userAuth.middleware.js";

const router = Router();
router
  .route("/workspaces")
  .post(userAuth, workspaceValidation(), validator, createWorkspace);

export default router;
