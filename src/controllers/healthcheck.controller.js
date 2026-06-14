import asyncHandler from "../utils/asyncHandler.js";
import apiResponse from "../utils/apiResponse.js";

const healthCheckStatus = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Server is running successfully without any conflict."
      )
    );
});

export default healthCheckStatus;
