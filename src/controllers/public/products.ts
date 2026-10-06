import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Product } from "../../models/products.ts";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/helper.ts";

const publicProductFields =
  "title slug description price discountPrice category stock images createdAt updatedAt";

export const listPublishedProducts = async (_req: Request, res: Response) => {
  try {
    const results = await Product.find({ isPublished: true })
      .select(publicProductFields)
      .populate({
        path: "category",
        select: "name slug",
        match: { isActive: true },
      })
      .sort({ createdAt: -1 })
      .lean();
    const products = results.filter((product) => product.category);

    return sendSuccessResponse(res, "Products fetched successfully.", {
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Public product list failed:", error);
    return sendErrorResponse(res, "Unable to fetch products.", 500);
  }
};

export const getPublishedProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return sendErrorResponse(res, "Product not found.", 404);
  }

  try {
    const filter = isValidObjectId(id)
      ? { _id: id, isPublished: true }
      : { slug: id, isPublished: true };
    const product = await Product.findOne(filter)
      .select(publicProductFields)
      .populate({
        path: "category",
        select: "name slug",
        match: { isActive: true },
      })
      .lean();

    if (!product || !product.category) {
      return sendErrorResponse(res, "Product not found.", 404);
    }

    return sendSuccessResponse(res, "Product retrieved successfully.", {
      product,
    });
  } catch (error) {
    console.error("Public product detail failed:", error);
    return sendErrorResponse(res, "Unable to fetch product.", 500);
  }
};
