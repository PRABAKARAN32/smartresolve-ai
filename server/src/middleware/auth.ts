import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { Role, User } from "../models/User";
import { HttpError, asyncHandler } from "../utils/errors";

export interface AuthUser {
  id: string;
  role: Role;
  departmentId: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const unauthenticated = () =>
  new HttpError(401, "UNAUTHENTICATED", "Please sign in to continue");

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthenticated();

  let sub: string;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    sub = String(payload.sub);
  } catch {
    throw unauthenticated();
  }
  if (!/^[a-f\d]{24}$/i.test(sub)) throw unauthenticated();

  // Always re-check the database so deactivated accounts lose access immediately
  const user = await User.findById(sub).select("role departmentId active");
  if (!user || !user.active) throw unauthenticated();

  req.user = {
    id: user.id,
    role: user.role as Role,
    departmentId: user.departmentId ? String(user.departmentId) : null,
  };
  next();
});

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          "FORBIDDEN",
          "You do not have permission to do that",
        ),
      );
    }
    next();
  };
