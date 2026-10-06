import type { Request, Response } from "express";
import { Category } from "../../models/category.ts";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/helper.ts";

export const listActiveCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name slug description createdAt updatedAt")
      .sort({ name: 1 })
      .lean();

    return sendSuccessResponse(res, "Categories fetched successfully.", {
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Public category list failed:", error);
    return sendErrorResponse(res, "Unable to fetch categories.", 500);
  }
};
