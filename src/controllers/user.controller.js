import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.models.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, avatar, password } = req.body;
  // check if username, email, and password are provided
  if (!username || !email || !password || !fullname) {
    return res.status(400).json({ message: "All fields are required" });
  }
  // check if username is already taken
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "Username is already taken" });
  }
  // save to database
  const newUser = new User({
    username,
    email,
    fullname,
    avatar: avatar ||  'https://placehold.co/200x200?text=Avatar',
    password
  })

  await newUser.save();
  // send response
  res.status(201).json({ message: "User registered successfully" });
});



export { registerUser };
