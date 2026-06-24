import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    workspaceName: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

workspaceSchema.pre("findOneAndDelete", async function (next) {
  const workspaceId = this.getQuery()._id;
  const WorkspaceMember = mongoose.model("WorkspaceMember");
  const Project = mongoose.model("Project");
  const Task = mongoose.model("Task");
  const Note = mongoose.model("Note");
  const AuditLog = mongoose.model("AuditLog");
  const ProjectMember = mongoose.model("ProjectMember");
  const WorkspaceMemberInvitation = mongoose.model("WorkspaceMemberInvitation");

  await Promise.all([
    WorkspaceMember.deleteMany({ workspaceId }),
    Project.deleteMany({ workspaceId }),
    Task.deleteMany({ workspaceId }),
    Note.deleteMany({ workspaceId }),
    AuditLog.deleteMany({ workspaceId }),
    ProjectMember.deleteMany({ workspaceId }),
    WorkspaceMemberInvitation.deleteMany({ workspaceId }),
  ]);
  next();
});

export default Workspace;
