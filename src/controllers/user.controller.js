import { upload } from "../middlewares/multer.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from 'fs'
import { ApiResponse } from "../utils/ApiResponse.js";

// How JWT Token Work 
// Step 1: Take input from user
// Algorithm for Register User
// get data from body 
// check email,username exist or not
// check for images ,check fro avatar
// upload them in cloudinary
// now create user object - create entry in db
// remove password and refresh token field from response
// check for user creation null or user created
// return res


function validateField(value, fieldName) {
    // const areAnyFieldsEmpty = [fullName, email, username, password].some(field => !field || field.trim() === "");
    if (value.trim() === "") {
        throw new ApiError(400, `${fieldName} is required`);
    }
}

const registerUser = asyncHandler(async (req, res, next) => {

    // Get Data From Form Body
    const { username, email, fullName, password } = req.body
    console.log("Email", email);
    console.log("Username", username);


    // Check username exist or not 
    validateField(fullName, "FullName");
    validateField(email, "Email");
    validateField(username, "Username");
    validateField(password, "Password");


    // Check Data exist in Mongo Or not
    const existedUser = await User.findOne({
        $or: [{ username: username }, { email: email }]
    })
    if (existedUser) throw new ApiError(409, "User with email or username already exists")


    // Now We Check Image MULTER GIVE YOU ACCESS
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Validate maximum file size (5MB)
    const avatarStats = fs.statSync(avatarLocalPath);
    const fileSizeInBytes = avatarStats.size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
    const maxFileSizeInMegabytes = 10;
    if (fileSizeInMegabytes > maxFileSizeInMegabytes) {
        throw new ApiError(400, "Avatar file exceeds the maximum size of 5MB");
    }

    const avatarImage = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if (!avatarImage) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        username:username.toLowercase(),
        email:email,
        fullName:fullName,
        avatar:avatarImage.url,
        coverImage:coverImage.url || "",
        password:password,
    });
    
    // After Create User We Remove Password and refreshToken
    const createdUser = await user.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) throw new ApiError(500,"Something went wrong while registering the user");

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Register Successfully")
    )
});

export { registerUser }