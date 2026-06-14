import { Router } from "express";
import healthCheckStatus from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/").get(healthCheckStatus);

export default router;
