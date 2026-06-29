import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

projectSchema.pre("findOneAndDelete", async function (next) {
  const projectId = this.getQuery()._id;

  const Task = mongoose.model("Task");
  const Note = mongoose.model("Note");
  const AuditLog = mongoose.model("AuditLog");
  const ProjectMember = mongoose.model("ProjectMember");

  await Promise.all([
    Task.deleteMany({ projectId }),
    Note.deleteMany({ projectId }),
    AuditLog.deleteMany({ projectId }),
    ProjectMember.deleteMany({ projectId }),
  ]);
  next();
});

export default Project;
