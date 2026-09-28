import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  UpdateAccount,
  changeCurrentPassword,
  updateAvatar,
  updateCoverImage,
  getChannelProfile,
} from "../controllers/user.controller.js";


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
UserRouter.route('/update-account').put(auth, UpdateAccount);
UserRouter.route('/change-password').put(auth, changeCurrentPassword);
UserRouter.route('/update-avatar').put(auth, updateAvatar);
UserRouter.route('/update-cover-image').put(auth, updateCoverImage);
UserRouter.route('/getChannelProfile').get(auth, getChannelProfile);
export default UserRouter;
