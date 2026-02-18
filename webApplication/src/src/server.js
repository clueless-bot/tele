import express from 'express';
import bodyParser from 'body-parser';
import router from './route.js'; // Import your routes
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 9898;
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const corsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'ngrok-skip-browser-warning'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Serve uploaded files from `src/utils/upload` (relative to this server file)
app.use('/utils/upload', express.static(path.join(__dirname, 'utils/upload')));

// Routes
app.use(router);

// Start server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

app.listen(9898, '0.0.0.0', () => {
  console.log("Server running on port 9898");
});

