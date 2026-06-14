export const DB_NAME = "nexusBase";

export const UserRoleEnum = {
  OWNER: "owner",
  PROJECT_ADMIN: "project_admin",
  EDITOR: "editor",
  VIEWER: "viewor",
};

export const AvailableUserRole = Object.values(UserRoleEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  COMPLETED: "completed",
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);
