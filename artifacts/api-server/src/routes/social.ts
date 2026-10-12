import { Router, type IRouter } from "express";
import { UserService } from "../services/UserService";

const router: IRouter = Router();

router.get("/social/leaderboard", async (req, res, next) => {
  try {
    const scope = (req.query.scope as "Friends" | "Global") || "Friends";
    const data = await UserService.getLeaderboard(scope);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/social/feed", async (_req, res, next) => {
  try {
    const data = await UserService.getSocialFeed();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/social/activities/:id/like", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await UserService.likeActivity(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
