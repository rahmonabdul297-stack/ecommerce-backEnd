import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.ts";
import { sendErrorResponse, verifyUsersigninToken } from "../utils/helper.ts";

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await verifyUsersigninToken(req, res, async () => {
    try {
      const userId = (req as any).id;
      const user = await User.findById(userId).select("role");

      if (!user || user.role !== "admin") {
        return sendErrorResponse(res, "Administrator access required.", 403);
      }

      return next();
    } catch (error) {
      console.error("Admin authorization failed:", error);
      return sendErrorResponse(
        res,
        "Unable to verify administrator access.",
        500,
      );
    }
  });
};
