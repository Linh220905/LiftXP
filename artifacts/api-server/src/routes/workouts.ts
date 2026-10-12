import { Router, type IRouter } from "express";
import { FinishWorkoutRequest } from "@workspace/api-zod";
import { UserService } from "../services/UserService";

const router: IRouter = Router();

router.get("/workouts/templates", (_req, res) => {
  res.json({
    templates: [
      {
        id: "push-day",
        name: "Push day",
        targetDescription: "12 sets · 4 exercises",
        targetSets: 12,
        exercises: [
          { name: "Bench Press", targetSets: 3, targetReps: "6–8", suggestedWeight: 60 },
          { name: "Incline Dumbbell Press", targetSets: 3, targetReps: "8–10", suggestedWeight: 22 },
          { name: "Shoulder Press", targetSets: 3, targetReps: "8–10", suggestedWeight: 20 },
          { name: "Tricep Pushdown", targetSets: 3, targetReps: "10–12", suggestedWeight: 25 },
        ],
      },
      {
        id: "pull-day",
        name: "Pull day",
        targetDescription: "12 sets · 4 exercises",
        targetSets: 12,
        exercises: [
          { name: "Deadlift", targetSets: 3, targetReps: "4–6", suggestedWeight: 100 },
          { name: "Barbell Row", targetSets: 3, targetReps: "8–10", suggestedWeight: 50 },
          { name: "Lat Pulldown", targetSets: 3, targetReps: "10–12", suggestedWeight: 45 },
          { name: "Bicep Curls", targetSets: 3, targetReps: "10–12", suggestedWeight: 14 },
        ],
      },
      {
        id: "leg-day",
        name: "Leg day",
        targetDescription: "12 sets · 4 exercises",
        targetSets: 12,
        exercises: [
          { name: "Back Squat", targetSets: 3, targetReps: "6–8", suggestedWeight: 80 },
          { name: "Romanian Deadlift", targetSets: 3, targetReps: "8–10", suggestedWeight: 70 },
          { name: "Leg Press", targetSets: 3, targetReps: "10–12", suggestedWeight: 120 },
          { name: "Calf Raises", targetSets: 3, targetReps: "12–15", suggestedWeight: 40 },
        ],
      },
    ],
  });
});

router.post("/workouts/finish", async (req, res, next) => {
  try {
    const body = FinishWorkoutRequest.parse(req.body);
    const result = await UserService.finishWorkout(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/workouts/history", async (_req, res, next) => {
  try {
    const history = await UserService.getWorkoutHistory();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
