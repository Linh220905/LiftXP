import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import workoutsRouter from "./workouts";
import ranksRouter from "./ranks";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(workoutsRouter);
router.use(ranksRouter);
router.use(socialRouter);

export default router;
