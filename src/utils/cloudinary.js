import { v2 as cloudinary } from 'cloudinary';
// file system for this
import fs from 'fs'
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// UploadOnCloudinary 
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const res = await cloudinary.uploader.upload(localFilePath,
            { resource_type: 'auto' },);
        console.log("File Uploaded in cloudinary" + res.url);
        return res
    } catch (error) {
        //if not upload then we unlink our file from server 
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export { uploadOnCloudinary }