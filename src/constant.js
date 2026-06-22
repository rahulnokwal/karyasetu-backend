export const DB_NAME = "nexusBase";

export const UserRoleEnum = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
};

export const AvailableUserRole = Object.values(UserRoleEnum);

export const TaskStatusEnum = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  COMPLETED: "COMPLETED",
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);

export const actionTypeEnum = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
  COMMENTED: "COMMENTED",
};

export const actionStatus = Object.values(actionTypeEnum);

export const ProjectRoleEnum = {
  PROJECT_ADMIN: "PROJECT_ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
};

export const AvailableProjectRoles = Object.values(ProjectRoleEnum);
