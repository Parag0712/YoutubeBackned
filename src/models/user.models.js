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
    // avatar: {
    //     type: String, //cloudinary url
    //     required: true
    // },
    // coverImage: {
    //     type: String //cloudinary url
    // },
    avatar: {
        url: {
            type: String,
            required: true
        },
        imgId: {
            type: String,
            required: true
        }
    },

    coverImage: {
        url: {
            type: String,
        },
        imgId: {
            type: String,
        }
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

//pre encrypt password and all 
userSchema.pre("save", async function (next) {
    //if not modified then next()
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// check encrypt password 
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password) //result true or false
}

// GenerateAccessToken :=> for generateToken
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            // algorithm: RS256,
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// GenerateRefreshToken :=> for refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// You can write aggregation query in this due to this plugin 
userSchema.plugin(mongooseAggregatePaginate);
export const User = mongoose.model("User", userSchema);