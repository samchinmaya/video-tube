import { asyncHandler } from "../utils/asynchandler.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

});


export { registerUser };
