import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { auth } from "../middlewares/auth.middleware.js";

const UserRouter = Router();
UserRouter.route('/register').post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  registerUser);
UserRouter.route('/login').post(loginUser);
UserRouter.route('/logout').post(auth, logoutUser);
UserRouter.route('/refresh-token').post(refreshAccessToken);
UserRouter.route('/current-user').get(auth, getCurrentUser);
export default UserRouter;
