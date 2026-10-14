import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

// The profile/workout/social routes still use a shared demo user. Keep them
// unreachable until the API has per-user authentication and data ownership.
router.use((_req, res) => {
  res.status(503).json({ error: "User API is unavailable until authentication is configured." });
});

export default router;
