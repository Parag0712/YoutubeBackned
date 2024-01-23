import mongoose, { Schema } from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
import bcrypt, { hash } from 'bcrypt' //for hash password
import jwt from 'jsonwebtoken'


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,//searchable field like rowIndex
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true //searchable field like rowIndex
    },
    avatar: {
        type: String, //cloudinary url
        required: true
    },
    coverImage: {
        type: String //cloudinary url
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }]
}, { timestamps: true })

//pre 
userSchema.pre("save", async function (next) {
    //if not modified then next()
    if (!this.isModified("password")) return next()
    this.password = bcrypt.hash(this.password, 10)
    next()
})

// check encrypt password 
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password) //result true or false
}

// GenerateAccessToken :=> for generateToken
userSchema.method.generateAccessToken = function(){
    jwt.sign(
        {
            _id:this.id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            algorithm:RS256,
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


// GenerateRefreshToken :=> for refresh token
userSchema.method.generateRefreshToken = function(){
    jwt.sign(
        {
            _id:this.id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// You can write aggregation query in this
userSchema.plugin(mongooseAggregatePaginate)
export const User = mongoose.model("User", userSchema)