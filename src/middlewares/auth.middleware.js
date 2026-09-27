import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from 'jsonwebtoken'

export const auth = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")
    if (!token) {
      throw new ApiError(401, "Unauthorized")
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      //TODO: discuss abt frontend
      throw new ApiError(401, "Unauthorized")
    }
    req.user = user
    next()
  } catch (error) {
    throw new ApiError(401, "Unauthorized")
  }
})
