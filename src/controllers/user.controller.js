import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerrors.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { APIresponse } from "../utils/APIresponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  // check if username, email, and password are provided
  if (!username || !email || !password || !fullname || [fullname,email,password,username].some((field) => field.trim() === "")) {
    throw new APIError(400, "All fields are required");
  }
  // check if username is already taken
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new APIError(409, "Username is already taken");
  }
  // images and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path
  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar is required")
  }
  if (!coverImageLocalPath) {
    throw new APIError(400, "Cover image is required")
  }
  //uploading on Cloudinary
  const avatarUrl = await uploadOnCloudinary(avatarLocalPath)
  const coverImageUrl = await uploadOnCloudinary(coverImageLocalPath)
  if (!avatarUrl) {
    throw new APIError(500, "Avatar upload failed")
  }
  if (!coverImageUrl) {
    throw new APIError(500, "Cover image upload failed")
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
    throw new APIError(500, "User not found")
  }

  return new APIresponse(201, createdUser, "User registered successfully").json(
    {
      statusCode: 201,
      data: createdUser,
      message: "User registered successfully",
    }
  )
});



export { registerUser };
