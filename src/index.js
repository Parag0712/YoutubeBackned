import dotenv from 'dotenv'
import connectDB from './db/db.js'
// require('dotenv').config({path:'./.env'})

dotenv.config({
    path: "./.env"
})
// ConnectDB
connectDB().then(()=>{
    // Here Your Some Other Code 
}).catch((error)=>{
    console.log("MONGO db connection failed !!! ", err);
})




/* FIRST APPROACH
import express from 'express'
const app= express()

(async function connectDB() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("ERROR",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`APP listing on ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error);
        throw error
    }
})()

*/