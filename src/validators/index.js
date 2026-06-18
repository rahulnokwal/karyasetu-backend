import { body, check } from "express-validator";
import apiError from "../utils/apiError.js";

export const userRegisterValidator = () => {
  return [
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Full name must be between 2 and 50 characters"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8, max: 64 })
      .withMessage("Password must be between 8 and 64 characters"),
    body("mobileNumber")
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage("If provided, must be a valid mobile phone number"),
  ];
};

export const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ];
};

export const passwordChangeValidation = () => {
  return [
    body("oldPassword")
      .trim()
      .notEmpty()
      .withMessage("oldPassword is required"),
    body("newPassword")
      .trim()
      .notEmpty()
      .withMessage("newPassword is required")
      .isLength({ min: 8, max: 64 })
      .withMessage("Password must be between 8 and 64 characters")
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error(
            "New password must be different from your current password"
          );
        }
        return true;
      }),
  ];
};

export const forgetPasswordValidation = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
  ];
};

export const resetPasswordValidation = () => {
  return [
    body("newPassword")
      .trim()
      .notEmpty()
      .withMessage("newPassword is required")
      .isLength({ min: 8, max: 64 })
      .withMessage("Password must be between 8 and 64 characters"),
  ];
};

export const updateProfileValidation = () => {
  return [
    check("file").custom((value, { req }) => {
      if (!req.file) {
        throw new Error("Profile not found");
      }
      return true;
    }),
  ];
};

export const userDetailsUpdateValidator = () => {
  return [
    body("fullName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Full name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
    body("mobileNumber")
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage("If provided, must be a valid mobile phone number"),
  ];
};
