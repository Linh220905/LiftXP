import { z } from "zod";

export const workoutDraftSchema = z.object({
  schemaVersion: z.literal(2),
  sessionId: z.string().min(1),
  routineName: z.string(),
  startedAt: z.number().finite().positive(),
  restEndAt: z.number().finite().positive().nullable(),
  currentExerciseIndex: z.number().int().nonnegative(),
  exercises: z
    .array(
      z.object({
        id: z.string().min(1),
        progression: z.enum(["off", "linear", "double", "greyskull", "time"]),
        unilateral: z.boolean(),
        supersetId: z.string().optional(),
        sets: z
          .array(
            z.object({
              setNumber: z.number().int().min(1),
              weightKg: z.number().finite().nonnegative(),
              weightInput: z.string().optional(),
              weightUnit: z.enum(["Metric", "Imperial"]).optional(),
              reps: z.string(),
              targetReps: z.number().int().min(1).max(100),
              rir: z.number().int().min(0).max(10).optional(),
              setType: z
                .enum(["normal", "warmup", "dropset", "failure"])
                .optional(),
              isDropSet: z.boolean().optional(),
              done: z.boolean(),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .min(1)
    .max(100),
});
