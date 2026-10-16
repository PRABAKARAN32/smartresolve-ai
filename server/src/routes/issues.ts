import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { Issue, URGENCIES } from "../models/Issue";
import { ActivityLog } from "../models/ActivityLog";
import { nextPublicId } from "../models/Counter";
import { BUILDINGS } from "../domain/buildings";
import { computePriority } from "../domain/priority";
import { detectEmergency } from "../domain/emergency";
import { canViewIssue } from "../domain/access";
import { logActivity } from "../services/activity";
import { HttpError, asyncHandler, parseObjectId } from "../utils/errors";

// strictObject: reporterId, status, priority etc. sent by a client are rejected.
// Those fields are decided by the server only.
const createIssueSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(5, "Title must be 5 to 120 characters")
    .max(120, "Title must be 5 to 120 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be 20 to 1000 characters")
    .max(1000, "Description must be 20 to 1000 characters"),
  building: z.enum(BUILDINGS, { message: "Choose a building from the list" }),
  room: z
    .string()
    .trim()
    .min(2, "Room must be 2 to 80 characters")
    .max(80, "Room must be 2 to 80 characters"),
  urgency: z.enum(URGENCIES, {
    message: "Urgency must be LOW, MEDIUM or HIGH",
  }),
  affectedCount: z
    .number()
    .int("Enter a whole number")
    .min(1, "Affected people must be between 1 and 500")
    .max(500, "Affected people must be between 1 and 500"),
  hazardFlag: z.boolean(),
});

type IssueDoc = InstanceType<typeof Issue>;

function toIssueView(i: IssueDoc) {
  return {
    id: i.id,
    publicId: i.publicId,
    title: i.title,
    description: i.description,
    building: i.building,
    room: i.room,
    urgency: i.urgency,
    affectedCount: i.affectedCount,
    hazardFlag: i.hazardFlag,
    status: i.status,
    priority: i.priority,
    priorityScore: i.priorityScore,
    priorityFactors: i.priorityFactors,
    predictedDepartment: i.predictedDepartment,
    predictionConfidence: i.predictionConfidence,
    routingState: i.routingState,
    departmentId: i.departmentId ? String(i.departmentId) : null,
    assigneeId: i.assigneeId ? String(i.assigneeId) : null,
    firstResponseAt: i.firstResponseAt,
    resolvedAt: i.resolvedAt,
    resolutionNote: i.resolutionNote,
    createdAt: i.get("createdAt"),
    updatedAt: i.get("updatedAt"),
  };
}

export const issuesRouter = Router();

// Must be registered before "/:id"
issuesRouter.get("/meta/buildings", (_req, res) => {
  res.json({ buildings: BUILDINGS });
});

issuesRouter.post(
  "/",
  authenticate,
  requireRole("REPORTER", "ADMIN"),
  validateBody(createIssueSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof createIssueSchema>;
    const user = req.user!;

    const pr = computePriority({
      urgency: input.urgency,
      affectedCount: input.affectedCount,
      hazardFlag: input.hazardFlag,
    });

    const issue = await Issue.create({
      publicId: await nextPublicId(),
      reporterId: user.id, // from the token, never from the request body
      ...input,
      status: "OPEN",
      routingState: "NEEDS_REVIEW",
      predictedDepartment: null,
      predictionConfidence: null,
      priority: pr.priority,
      priorityScore: pr.score,
      priorityFactors: pr.factors,
    });

    await logActivity({
      issueId: issue._id,
      actorId: user.id,
      action: "ISSUE_CREATED",
      after: { publicId: issue.publicId, status: "OPEN" },
    });
    await logActivity({
      issueId: issue._id,
      actorId: null,
      action: "PRIORITY_RECOMMENDED",
      after: { priority: pr.priority, score: pr.score, factors: pr.factors },
    });

    res.status(201).json({
      issue: toIssueView(issue),
      emergencyGuidance: detectEmergency(
        `${input.title} ${input.description}`,
        input.hazardFlag,
      ),
    });
  }),
);

issuesRouter.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const issue = await Issue.findById(parseObjectId(req.params.id));
    if (!issue) throw new HttpError(404, "NOT_FOUND", "Issue not found");
    if (!canViewIssue(req.user!, issue)) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "You do not have access to this issue",
      );
    }
    res.json({ issue: toIssueView(issue) });
  }),
);

issuesRouter.get(
  "/:id/activity",
  authenticate,
  asyncHandler(async (req, res) => {
    const issue = await Issue.findById(parseObjectId(req.params.id));
    if (!issue) throw new HttpError(404, "NOT_FOUND", "Issue not found");
    if (!canViewIssue(req.user!, issue)) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "You do not have access to this issue",
      );
    }
    const logs = await ActivityLog.find({ issueId: issue._id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      activity: logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        actorId: l.actorId ? String(l.actorId) : "SYSTEM",
        before: l.before,
        after: l.after,
        reason: l.reason,
        createdAt: l.createdAt,
      })),
    });
  }),
);
