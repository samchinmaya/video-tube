import { asyncHandler } from "../utils/asynchandler.js";

const registerUser = asyncHandler(async (req, res) => {
  console.log("i'm here")
  return res.status(200).json({
    message: "User registered successfully"
  })
});


export { registerUser };
