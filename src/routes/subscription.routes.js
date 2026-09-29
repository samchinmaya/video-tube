import { Router } from "express";
import { toggleSubscription } from "../controllers/subscription.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const SubscriptionRouter = Router();
SubscriptionRouter.route('/c/:channelId').post(auth, toggleSubscription);

export default SubscriptionRouter;
