import multer from 'multer'
import {v4 as uuidv4 } from 'uuid'

// For File We Use This 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp');
    },
    filename: function (req, file, cb) {
        const uniqueFilename = uuidv4();
        cb(null,uniqueFilename+file.originalname);
    }
})

export const upload = multer({ storage: storage })