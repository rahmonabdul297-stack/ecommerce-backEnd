import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type {
  CustomTokenPayload,
  TokenPayloadTypes,
} from "../types/model-types.ts";
import { User } from "../models/User.ts";
const JWT_USER_SECRET = process.env.JWT_USER_SECRET;
export const sendSuccessResponse = (
  res: Response,
  message: string,
  data?: any,
) => {
  return res.status(200).json({
    success: true,
    message: message,
    data: data,
  });
};

export const sendErrorResponse = (
  res: Response,
  message: string,
  status = 400,
) => {
  return res.status(status).json({
    success: false,
    message: message,
  });
};

export const getAuthCookieOptions = (maxAge?: number) => ({
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  ...(maxAge === undefined ? {} : { maxAge }),
});

export const CheckSession = async (req: Request, res: Response) => {
  if (!(req as any).id) {
    return sendErrorResponse(res, "no session cookie found!", 401);
  }
  return sendSuccessResponse(res, "session found!");
};
export const verifyUsersigninToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // If you use cookie-parser, req.cookies will contain all parsed cookies automatically
    // Look for your specific token cookie key (e.g., req.cookies.token or req.cookies.accessToken)
    const token =
      req.cookies?.token ||
      req.cookies?.accessToken ||
      req.cookies?.sessionToken;

    if (!token) {
      return sendErrorResponse(
        res,
        "no session token, You're not authenticated!",
        401,
      );
    }

    const user = jwt.verify(
      token,
      (process.env.JWT_USER_SECRET || JWT_USER_SECRET) as string,
    ) as TokenPayloadTypes;

    (req as any).id = user.id;
    next();
  } catch (error) {
    console.error("Access Token Verification Error:", (error as Error).message);
    return sendErrorResponse(
      res,
      "Access token expired or invalid. Please refresh.",
      401,
    );
  }
};
//refreshSession
export const refreshSession = async (req: Request, res: Response) => {
  try {
    let oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken && req.headers.cookie) {
      const match = req.headers.cookie.match(
        new RegExp("(^| )refreshToken=([^;]+)"),
      );
      if (match) {
        oldRefreshToken = match[2];
      }
    }

    if (!oldRefreshToken) {
      return sendErrorResponse(
        res,
        "Access Denied: No refresh token provided.",
        401,
      );
    }

    let decoded: CustomTokenPayload;
    try {
      decoded = jwt.verify(
        oldRefreshToken,
        process.env.REFRESH_TOKEN_SECRET as string,
      ) as CustomTokenPayload;
    } catch (jwtError) {
      console.log("JWT Verification failed. Token sent was:", oldRefreshToken);
      return sendErrorResponse(
        res,
        "Session expired. Please sign in again.",
        401,
      );
    }

    // 1. Double-check user still exists in DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendErrorResponse(
        res,
        "User no longer exists. Please sign in again.",
        401,
      );
    }

    // 3. Generate new Access Token (15 min)
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_USER_SECRET as string,
      { expiresIn: "15m" },
    );

    res.cookie(
      "accessToken",
      newAccessToken,
      getAuthCookieOptions(15 * 60 * 1000),
    );

    // 4. Generate new extended Refresh Token (7 days)
    const cookieMaxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    const newRefreshToken = jwt.sign(
      { id: user._id, sessionType: "extended" },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: "7d" },
    );

    res.cookie(
      "refreshToken",
      newRefreshToken,
      getAuthCookieOptions(cookieMaxAge),
    );

    return sendSuccessResponse(res, "Session tokens successfully renewed!", {
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Critical Refresh Error:", (error as Error).message);
    return sendErrorResponse(res, "An unexpected error occurred.", 500);
  }
};

// Generate alphanumeric token
export const CreatedRandomBytes = () =>
  new Promise((resolve, reject) => {
    crypto.randomBytes(6, (err, buff) => {
      if (err) reject(err);
      const token = buff.toString("hex");
      resolve(token);
    });
  });

// Generate numeric token
export const createNumericOTP = () =>
  new Promise((resolve, reject) => {
    // Generate a secure integer between 100,000 (inclusive) and 1,000,000 (exclusive)
    crypto.randomInt(100000, 1000000, (err, n) => {
      if (err) return reject(err);

      const OTP = n.toString(); // Convert the 6-digit number to a string
      resolve(OTP);
    });
  });

export const getCartQuery = (req: Request) => {
  if (req._id) return { user: req._id };
  const guestToken = req.headers["x-guest-token"] as string;
  return { guestToken };
};
