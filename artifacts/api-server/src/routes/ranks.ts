import { Router, type IRouter } from "express";
import { UserService } from "../services/UserService";

const router: IRouter = Router();

router.get("/ranks", async (_req, res, next) => {
  try {
    const data = await UserService.getRanks();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
