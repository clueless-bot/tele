import express from 'express';
import morgan from 'morgan';
import statusMonitor from 'express-status-monitor';
import router from './route.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from "path";
import { fileURLToPath } from 'url';
import { MEDIA_CACHE_ROOT } from './services/mediaPipeline.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const uploadDirectory = path.join(__dirname, "utils", "upload");
// Profile uploads are stored as /utils/upload/<filename> by the API. Keep the
// legacy /public URL as an alias so existing records continue to work.
app.use("/utils/upload", express.static(uploadDirectory, { maxAge: 0 }));
app.use("/public", express.static(uploadDirectory, { maxAge: 0 }));
app.use('/media/jobs', express.static(MEDIA_CACHE_ROOT, {
  fallthrough: true,
  immutable: false,
  maxAge: '5m',
  setHeaders: (res, filePath) => {
    if (/\.(?:m4s|mp4)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (/\.(?:m3u8|mpd)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=2, must-revalidate');
  },
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));
const corsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Range', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Accept-Ranges', 'Content-Length', 'Content-Range', 'Content-Type'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(statusMonitor());
app.setMaxListeners(100);
app.use('/', router);

export default app;
