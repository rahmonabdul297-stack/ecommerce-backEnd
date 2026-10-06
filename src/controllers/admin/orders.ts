import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Order } from "../../models/order.ts";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/helper.ts";

const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const listOrders = async (req: Request, res: Response) => {
  const pageValue = Number(req.query.page ?? 1);
  const limitValue = Number(req.query.limit ?? 20);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 100)
      : 20;
  const sortBy = [
    "createdAt",
    "updatedAt",
    "totalAmount",
    "orderStatus",
  ].includes(String(req.query.sortBy))
    ? String(req.query.sortBy)
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  try {
    const [orders, total] = await Promise.all([
      Order.find()
        .populate("user", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(),
    ]);

    return sendSuccessResponse(res, "Orders fetched successfully.", {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return sendErrorResponse(res, "Unable to fetch orders.", 500);
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: unknown };

  if (!isValidObjectId(id)) {
    return sendErrorResponse(res, "Invalid order ID.", 400);
  }

  if (
    typeof status !== "string" ||
    !orderStatuses.includes(status as (typeof orderStatuses)[number])
  ) {
    return sendErrorResponse(
      res,
      `Status must be one of: ${orderStatuses.join(", ")}.`,
      400,
    );
  }

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { orderStatus: status },
      { new: true, runValidators: true },
    ).populate("user", "name email");

    if (!order) {
      return sendErrorResponse(res, "Order not found.", 404);
    }

    return sendSuccessResponse(
      res,
      "Order status updated successfully.",
      order,
    );
  } catch (error) {
    console.error("Failed to update order status:", error);
    return sendErrorResponse(res, "Unable to update order status.", 500);
  }
};
