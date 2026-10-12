import { Router, type IRouter } from "express";
import { OnboardingRequest, UpdateProfileRequest } from "@workspace/api-zod";
import { UserService } from "../services/UserService";

const router: IRouter = Router();

router.get("/profile", async (_req, res, next) => {
  try {
    const data = await UserService.getProfileAndStats();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const body = UpdateProfileRequest.parse(req.body);
    const data = await UserService.updateProfile(body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/onboarding", async (req, res, next) => {
  try {
    const body = OnboardingRequest.parse(req.body);
    const data = await UserService.completeOnboarding(body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
