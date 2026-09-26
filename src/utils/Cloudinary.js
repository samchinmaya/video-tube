import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { upload } from '../middlewares/multer.middleware.js';


// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
  try {
    if (!localFilePath) return null; // upload not possible
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type:"auto"
    })
// file uploaded successfully
    console.log(`response: ${response.url}`)
    fs.unlinkSync(localFilePath) // remove the local temp file now that it's on Cloudinary
    return response.url;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
}

export { uploadOnCloudinary }
