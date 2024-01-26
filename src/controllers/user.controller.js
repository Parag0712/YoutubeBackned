import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.models.js'
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from 'fs'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import path from "path";

function validateField(value, fieldName) {
    // const areAnyFieldsEmpty = [fullName, email, username, password].some(field => !field || field.trim() === "");
    if (value.trim() === "") {
        throw new ApiError(400, `${fieldName} is required`);
    }
}

function validateFile(avatarLocalPath, mb) {
    const avatarStats = fs.statSync(avatarLocalPath);
    const fileSizeInBytes = avatarStats.size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
    const maxFileSizeInMegabytes = mb;
    if (fileSizeInMegabytes > maxFileSizeInMegabytes) {
        throw new ApiError(400, `Avatar file exceeds the maximum size of ${mb}MB`);
    }
}

// GenerateAccessToken
const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, error + "Something went wrong while generating access and refresh token 1");
    }
}


/** UserRegister
    * @function UserRegister
    * 
    * How JWT Token Work 
    * Step 1: Take input from user
    * Algorithm for Register User
    * get data from body 
    * check email,username exist or not
    * check for images ,check fro avatar
    * upload them in cloudinary
    * now create user object - create entry in db
    * remove password and refresh token field from response
    * check for user creation null or user created
    * return res
*/
const registerUser = asyncHandler(async (req, res, next) => {
    // Get Data From Form Body
    const { username, email, fullName, password } = req.body
    // Check username exist or not 
    validateField(fullName, "FullName");
    validateField(email, "Email");
    validateField(username, "Username");
    validateField(password, "Password");

    // Check Data exist in Mongo Or not
    const existedUser = await User.findOne({
        $or: [{ username: username }, { email: email }]
    });

    if (existedUser) throw new ApiError(409, "User with email or username already exists");

    // Now We Check Image MULTER GIVE YOU ACCESS
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    let coverImage;
    

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log("helo");
        if(!coverImage){
            throw new ApiError(400, "Error while uploading a CoverImage");
        }
    }


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
    if (!avatarImage) {
        throw new ApiError(400, "Error while uploading a avatar");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email: email,
        fullName: fullName,
        avatar: {
            url: avatarImage.url,
            imgId: avatarImage.public_id,
        },
        coverImage: {
            url: coverImage?.url || "",
            imgId: coverImage?.public_id || "",
        },
        password: password,
    });

    // After Create User We Remove Pass word and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Register Successfully")
    )
});

/** @function LoginUser 
    * req.body -> take data from body
    * username or email -> validate data email and password
    * find user 
    * if found then check password
    * if password not match then give error
    * generate access toke and refresh token
    * send token in secure cookie
    * then send response
*/
const loginUser = asyncHandler(async (req, res, next) => {

    // Take Data from body 
    const { username, email, password } = req.body;

    // Check email or username exits or not
    if (!username && !email) {
        throw new ApiError(400, `Username or Email is required`);
    }

    validateField(password, "password");

    // Check user exits in database
    const user = await User.findOne({
        $or: [{ username: username }, { email: email }]
    });

    // if not exist in database then send error
    if (!user) { throw new (404, "User does Not Exist"); }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);

    //if password not match then send error
    if (!isPasswordValid) {
        throw new (401, "Invalid user credentials");
    }

    // Now generate token
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    //remove password and refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //store in cookie 
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                },
                "User Logged In Successfully"
            )
        );
});


// Logout 
const logoutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(
        req.user._id, //from middleware
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true //update value given
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

});

// RefreshToken 
const refreshAccessToken = asyncHandler(async (req, res, next) => {
    // Req.body.refreshToken give body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        //decodeToken
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        //find user
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        //if match then give new token
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        // Options
        const options = {
            httpOnly: true,
            secure: true
        }

        //generate new token
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);

        //send cookie and status
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token refreshed"
                )
            );
    } catch (error) {
        //if some error then give error
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { newPassword, password } = req.body;
    validateField(password, "password");
    validateField(newPassword, "New Password");
    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
});

// getCurrentUser 
const getCurrentUser = asyncHandler(async (req, res, next) => {
    return res
        .status(200)
        .json(new ApiResponse(200, { user: req.user }, "User fetched successfully"))
});

// updateAccount
const updateAccountDetails = asyncHandler(async (req, res, next) => {
    const { fullName, email } = req.body;
    validateField(fullName, "full name");
    validateField(email, "email");
    try {
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            }
            ,
            {
                new: true //give update value 
            }
        ).select("-password");

        return res
            .status(200)
            .json(
                new ApiResponse(200, { user }, "Account details updated successfully")
            )
    } catch (error) {
        throw new ApiError(401, error)
    }
});

// Now File Base data update
// Now File Based data update

const updateUserAvatarImage = asyncHandler(async (req, res, next) => {

    // File Get From User
    const avatarLocalPath = req.file?.path;

    // ValidData avatar Local path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is required");
    }
    // Validate maximum file size (5MB)
    validateFile(avatarLocalPath, "10");

    // find user id
    const user = await User.findById(req.user?._id).select('-password');;
    const avatarImageDelete = await deleteFromCloudinary(user.avatar.imgId);

    //new avatarImage upload
    const avatarImage = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarImage) {
        throw new ApiError(400, "Error while uploading a avatar");
    }


    user.avatar.url = avatarImage.url;
    user.avatar.imgId = avatarImage.public_id;
    // //and save url
    const updatedUser = await user.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Avatar image updated successfully")
        )
});


const updateUserCoverImage = asyncHandler(async (req, res, next) => {
    const coverImageLocalPath = req.file?.path;

    // ValidData avatar Local path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required");
    }

    const user = await User.findById(req.user?._id).select("-password");

    const coverImageDelete = await deleteFromCloudinary(user.coverImage.imgId);
    // }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage){
        throw new ApiError(400, "Error while uploading a avatar");
    }
    user.coverImage.url = coverImage.url;
    user.coverImage.imgId = coverImage.public_id;

    const updatedUser = await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Cover Image updated successfully")
        )
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatarImage, updateUserCoverImage }