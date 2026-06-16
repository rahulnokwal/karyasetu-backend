import Router from "express";
import validate from "../middleware/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
} from "../validators/index.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/userAuth.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";

const router = Router();

router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/logout").post(userAuth, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router;
