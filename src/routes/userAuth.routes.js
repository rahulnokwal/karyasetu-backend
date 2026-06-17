import Router from "express";
import validate from "../middleware/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  passwordChangeValidation,
} from "../validators/index.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  verifyEmailAddress,
  resendEmailVerification,
} from "../controllers/userAuth.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";

const router = Router();

router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/logout").post(userAuth, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(userAuth, getCurrentUser);
router
  .route("/change-password")
  .post(userAuth, passwordChangeValidation(), validate, changePassword);
router.route("/verify-email/:verificationToken").get(verifyEmailAddress);
router
  .route("/resend-email-verification")
  .post(userAuth, resendEmailVerification);

export default router;
