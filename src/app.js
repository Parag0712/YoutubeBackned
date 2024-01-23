import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

// Allow Different Site Or App
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
));

// for json req we do this setting (json accept in this application (express.json))
app.use(express.json({ limit: "20kb" }));

// for url encode  /parag vadgama  encode like parag+vadgama
// for this we use urlencoded
// extend object in object
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) => {

});

export { app }