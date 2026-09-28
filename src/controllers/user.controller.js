import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//Token generation
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(404, "User not found")
    }
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }


  } catch (err) {
    throw new ApiError(500, "Failed to generate tokens");

  }
}

// user registration
//
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  // check if username, email, and password are provided
  if (!username || !email || !password || !fullname || [fullname,email,password,username].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  // check if username is already taken
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new ApiError(409, "Username is already taken");
  }
  // images and avatar

  const avatarLocalPath = req.files?.avatar?.[0]?.path
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path
  console.log(req.files)
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required")
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required")
  }

  //uploading on Cloudinary
  //
  const avatarUrl = await uploadOnCloudinary(avatarLocalPath)
  const coverImageUrl = await uploadOnCloudinary(coverImageLocalPath)
  if (!avatarUrl) {
    throw new ApiError(500, "Avatar upload failed")
  }
  if (!coverImageUrl) {
    throw new ApiError(500, "Cover image upload failed")
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    fullname: fullname.toLowerCase(),
    avatar: avatarUrl,
    coverImage: coverImageUrl,
    password
  })
  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "User not found")
  }

  return new ApiResponse(201, createdUser, "User registered successfully").json(
    res
  )
});

// user login
//
const loginUser = asyncHandler(async (req, res) => {
  const {username, email, password} = req.body
  if (!username && !password) {
    throw new ApiError(400, "Username and password are required")
  }
  const user = await User.findOne({$or: [{username}, {email}]}).select("+password")
  if (!user) {
    throw new ApiError(404, "User not found")
  }
  const isPasswordValid = await user.isPasswordCorrect(password)
  console.log(isPasswordValid)
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password")
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)// accessToken and refreshToken are sent as cookies and set the cookie options
    .cookie("refreshToken", refreshToken, options)// accessToken and refreshToken are sent as cookies and set the cookie options
    .json(new ApiResponse(200,
      {
        user: loggedInUser, accessToken
      }, "User logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      refreshToken: null,
    }, {
      new: true,
    }
  )
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res.status(200)
    .cookie("accessToken", "", options)
    .cookie("refreshToken", "", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required")
  }
  let decodedToken
  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token")
  }
  const user = await User.findById(decodedToken?.userId).select("+refreshToken")
  if(!user) {
    throw new ApiError(404, "User not found")
  }
  if(user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is invalid")
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed successfully"))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body
  const user = await User.findById(req.user._id)
  if (!user) {
    throw new ApiError(404, "User not found")
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect")
  }
  if (newPassword !== confPassword) {
    throw new ApiError(400, "Passwords do not match")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  return res.status(200).json(new ApiResponse(200, { user }, "User fetched successfully"))
})
const UpdateAccount = asyncHandler(async (req, res) => {
  const { email, fullname } = req.body
  if (!email && !fullname && email===User.email && fullname===User.fullname) {
    throw new ApiError(400, "No fields to update")
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { email, fullname } }, { new: true }).select("-password")
  if (!user) {
    throw new ApiError(500, "failed to update account")

  }
  return res.status(200).json(new ApiResponse(200, { user }, "Account updated successfully"))
})


const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if (!avatar.url) {
    throw new ApiError(500, "failed to upload avatar")
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatar: avatar.url } }, { new: true }).select("-password")
  if (!user) {
    throw new ApiError(500, "failed to update avatar")
  }
  return res.status(200).json(new ApiResponse(200, { avatar: user.avatar }, "Avatar updated successfully"))
})
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!coverImage.url) {
    throw new ApiError(500, "failed to upload cover image")
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { coverImage: coverImage.url } }, { new: true }).select("-password")
  if (!user) {
    throw new ApiError(500, "failed to update cover image")
  }
  return res.status(200).json(new ApiResponse(200, { coverImage: user.coverImage }, "Cover image updated successfully"))
})
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  UpdateAccount,
  updateAvatar,
  updateCoverImage
};
