import dotenv from 'dotenv'
import connectDB from './db/db.js'
import { app } from './app.js'
// require('dotenv').config({path:'./.env'})

dotenv.config({
    path: "./.env"
})

// call function 
connectDB().then(() => {
    // is called middleware
    app.on("error",(error)=>{
        console.log("ERROR :",error);
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
}).catch((error) => {
    console.log("MONGO db connection failed !!! ", err);
});




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