import Router from "express";
import validate from "../middleware/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  passwordChangeValidation,
  forgetPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
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
  sendForgetPasswordMail,
  resetPassword,
  updateUserProfile,
} from "../controllers/userAuth.controller.js";
import userAuth from "../middleware/userAuth.middleware.js";
import { uploadNotes, uploadProfile } from "../middleware/multer.middleware.js";

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
router
  .route("/forget-password-mail")
  .post(forgetPasswordValidation(), validate, sendForgetPasswordMail);
router
  .route("/reset-password/:passwordToken")
  .post(resetPasswordValidation(), validate, resetPassword);
router
  .route("/update-profile")
  .post(
    userAuth,
    uploadProfile.single("profile"),
    updateProfileValidation(),
    validate,
    updateUserProfile
  );

export default router;
