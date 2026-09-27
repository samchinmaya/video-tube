import { asyncHandler } from "../utils/asynchandler.js"
import { APIError } from "../utils/APIerrors.js"
import 'dotenv/config';
import { User } from "../models/user.models.js"

import jwt from 'jsonwebtoken'
export const auth = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")
    if (!token) {
      throw new APIError(401, "Unauthorized")
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      //TODO: discuss abt frontend
      throw new APIError(401, "Unauthorized")
    }
    req.user = user
    next()
  } catch (error) {
    throw new APIError(401, "Unauthorized")
  }
})
