import Router from "express";
import {
  addNote,
  getTaskNotes,
  deleteNote,
  updateNote,
} from "../controllers/note.controller.js";
import { NoteValidation } from "../validators/index.js";
import userAuth from "../middleware/userAuth.middleware.js";
import { validateProjectPermissions } from "../middleware/validatePermissions.js";
import validate from "../middleware/validator.middleware.js";
import { AvailableProjectRoles, ProjectRoleEnum } from "../constant.js";

const router = Router({ mergeParams: true });
router
  .route("/")
  .post(
    userAuth,
    validateProjectPermissions(AvailableProjectRoles),
    NoteValidation(),
    validate,
    addNote
  );

router
  .route("/")
  .get(
    userAuth,
    validateProjectPermissions(AvailableProjectRoles),
    getTaskNotes
  );

router.route("/:noteId").delete(userAuth, deleteNote);

router
  .route("/:noteId")
  .patch(userAuth, NoteValidation(), validate, updateNote);

export default router;
