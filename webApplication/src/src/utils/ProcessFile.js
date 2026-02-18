import multer from "multer";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
    "image/jpg": "jpg",
    "image/jpeg": "jpg",
    "image/png": "png",
  };

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null,path.join(__dirname, './upload'));
    },
    filename: (req, file, callback) => {
        const name = file?.originalname?.split(" ").join("_");
        const extension = MIME_TYPES[file?.mimetype];
        callback(null, name + Date.now() + "." + extension);
    }
})


const processFile = multer({ storage: storage }).single("thumbnail")

export default processFile;