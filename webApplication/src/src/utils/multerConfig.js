import multer from 'multer';

// Configure Multer to store files in memory as a Buffer
const storage = multer.memoryStorage();

const upload = multer({ storage });

export default upload;

// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';

// // ESM mein __dirname define karna
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Upload folder ka absolute path
// const uploadDir = path.join(__dirname,  'upload');

// // Ensure folder exists
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// // Multer diskStorage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage });

// export default upload;
