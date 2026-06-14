import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      unique: true,
    },
    profile: {
      type: String,
      default: "https://placehold.co/200", // change later
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationTokenExpiry: {
      type: Date,
    },
    forgetPasswordToken: {
      type: String,
    },
    forgetPasswordTokenExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.verifyPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
