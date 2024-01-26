import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// Register Route
router.route("/register").post(
    // For Multiple image upload we use multer field
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)
export default router


//login user route
router.route("/login").post(
    loginUser
)

//post method: for refreshToken
router.route("/refresh-token").post(refreshAccessToken);



//Secured Routes here verifyJWT is middleware and logout user is function
//post method: for logout 
router.route("/logout").post(verifyJWT,logoutUser)