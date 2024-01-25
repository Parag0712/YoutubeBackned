import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from 'fs'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt  from "jsonwebtoken";

function validateField(value, fieldName) {
    // const areAnyFieldsEmpty = [fullName, email, username, password].some(field => !field || field.trim() === "");
    if (value.trim() === "") {
        throw new ApiError(400, `${fieldName} is required`);
    }
}

// GenerateAccessToken
const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500, error+"Something went wrong while generating access and refresh token 1");
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
    })
    if (existedUser) throw new ApiError(409, "User with email or username already exists")

    // Now We Check Image MULTER GIVE YOU ACCESS
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    let coverImage;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.Length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
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
        throw new ApiError(400, "Avatar file is required j");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email: email,
        fullName: fullName,
        avatar: avatarImage.url,
        coverImage: coverImage?.url || "",
        password: password,
    });

    // After Create User We Remove Password and refreshToken
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

    
    console.log(username);
    console.log(email);
    console.log(password);
    // Check email or username exits or not
    if (!username || !email) {
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
    

    console.log("success validation ");
    // Now generate token
    const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id);
    
    //remove password and refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //store in cookie 
    const options = {
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,
                accessToken:accessToken,
                refreshToken:refreshToken,
            },
            "User Logged In Successfully"
            )
    );
});


// Logout 
const logoutUser = asyncHandler(async (req,res,next)=>{
    await User.findByIdAndUpdate(
        req.user._id, //from middleware
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true //update value given
        }
    );
    
    const options = {
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))

});

const refreshAccessToken = asyncHandler(async (req,res,next)=>{
    // Req.body.refreshToken give body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request");
    }
    
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = user.findById(decodedToken._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly:true,
            secure:true
        }

        const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id);

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access Token refreshed"
            )
        );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
});

export { registerUser, loginUser ,logoutUser}