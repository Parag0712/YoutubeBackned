import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

// verify Jwt function 
export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Req.Header for android ("Authorization") 
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Decode JWT token 
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        //Find By Id if found then user all ready login 
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // if not found then invalid response
        if (!user) {
            // TODO Discuss About Frontend
            throw new ApiError(401, "Invalid Access Token");
        }

        // We store user data in user
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
}) 