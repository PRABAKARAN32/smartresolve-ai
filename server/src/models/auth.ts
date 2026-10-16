import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { User } from "../models/User";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { HttpError, asyncHandler } from "../utils/errors";

// strictObject: any extra field (like "role") is rejected, so nobody can pick a privileged role
const registerSchema = z.strictObject({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(1, "Password is required").max(72),
});

const tooMany = {
  error: {
    code: "RATE_LIMITED",
    message: "Too many attempts. Please try again in a few minutes.",
  },
};
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// Compared against when the email doesn't exist, so response time doesn't reveal valid emails
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function signToken(userId: string, role: string) {
  return jwt.sign({ role }, config.jwtSecret, {
    subject: userId,
    expiresIn: "8h",
    algorithm: "HS256",
  });
}

function publicUser(u: {
  id: string;
  displayName: string;
  email: string;
  role: string;
  departmentId?: unknown;
}) {
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId ? String(u.departmentId) : null,
  };
}

export const authRouter = Router();

authRouter.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { displayName, email, password } = req.body as z.infer<
      typeof registerSchema
    >;

    if (await User.exists({ email })) {
      throw new HttpError(
        409,
        "EMAIL_TAKEN",
        "An account with this email already exists",
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      displayName,
      email,
      passwordHash,
      role: "REPORTER",
    });

    res
      .status(201)
      .json({ token: signToken(user.id, user.role), user: publicUser(user) });
  }),
);

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await User.findOne({ email }).select("+passwordHash");
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !ok || !user.active) {
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    res.json({ token: signToken(user.id, user.role), user: publicUser(user) });
  }),
);

export const meRouter = Router();

meRouter.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id);
    if (!user)
      throw new HttpError(401, "UNAUTHENTICATED", "Please sign in to continue");
    res.json({ user: publicUser(user) });
  }),
);
