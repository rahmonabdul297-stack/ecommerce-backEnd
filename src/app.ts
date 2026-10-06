import "dotenv/config";
import express from "express";
import Admin from "./routes/admin/admin-routes.ts";
import Public from "./routes/public/public-routes.ts";
import UserAuth from "./routes/user/user-auth-route.ts";
import UserProfile from "./routes/user/user-profile-route.ts";
import paymentRoutes from "./routes/payment/payment-route.ts";
import connectDB from "./db/index.ts";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
const PORT = Number(process.env.PORT) || 5000;
app.use(cookieParser());
const frontendOrigin = new URL(
  process.env.FRONTEND_URL || "https://nokata-ten.vercel.app",
).origin;

app.use(
  cors({
    origin: ["http://localhost:5173", frontendOrigin],
    credentials: true,
  }),
);

// middleware

connectDB();
app.use(express.json());

// ... other routes
app.use("/api/v1/admin", Admin);
app.use("/api/v1", Public);
app.use("/api/v1/auth", UserAuth);
app.use("/api/v1/profile", UserProfile);
app.use("/api/v1/payments", paymentRoutes);

app.listen(PORT, () => {
  console.log(`Server is up and running on http://localhost:${PORT}`);
});
