import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
const loginUser = async (req, res) => {
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
    httpOnly: true,// this means the cookie cannot be accessed by the client
    secure: true,// this means the cookie can only be sent over HTTPS


  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)// accessToken and refreshToken are sent as cookies and set the cookie options
    .cookie("refreshToken", refreshToken, options)// accessToken and refreshToken are sent as cookies and set the cookie options
    .json(new ApiResponse(200,
      {
        user: loggedInUser, accessToken
      }, "User logged in successfully"))
}

const logoutUser = async (req, res) => {
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
}

export { registerUser, loginUser, logoutUser };
