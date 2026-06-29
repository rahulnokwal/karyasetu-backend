import mongoose from "mongoose";
import { actionStatus } from "../constant.js";

const auditLogSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actionType: {
      type: String,
      enum: actionStatus,
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
