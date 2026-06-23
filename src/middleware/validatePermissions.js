import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import WorkspaceMember from "../models/workspaceMember.models.js";

const validatePermissions = (allowedRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
      throw new apiError(400, "Workspace ID is missing");
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId: workspaceId,
      userId: req.user._id,
    });
    if (!membership) {
      throw new apiError(404, "Workspace not found or you are not a member");
    }

    const currentRole = membership.role;
    req.workspaceRole = currentRole;
    if (!allowedRoles.includes(currentRole)) {
      throw new apiError(
        403,
        "You do not have permission to perform this action in this workspace"
      );
    }
    next();
  });
};

export default validatePermissions;
