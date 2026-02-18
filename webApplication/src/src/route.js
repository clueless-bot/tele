import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { like } from 'drizzle-orm';
import {
  createNewChannel,
  channelLogin,
  handleChannelContent,
  handleDeleteContent,
  channelSubscribe,
  channelUnSubscribe,
  handleLatestContent,
  forgotPassword,
  verifyOtp,
  updatePassword,
  handleUpload,
  handleSubscription,
  handleDesub,
  newUpdatePassword,
  getAllChannels,
  searchChannels,
  channelSubscriptions,
  getChannelById,
  getChannelProfile,
  updateChannelProfile,
  getShortLinkById,
  getUploadById,
  handleUpdateUpload,
  generateQRCode,
  handleTorrentStream,
  streamTorrentFile,
  handleGoogleDrive,
  handleDropbox,
  handlePCloud,
  handleIcedrive,
  handleMega,
  resolveShortLinkToOriginal
} from './controller/channel.js';

import {
  generateShortLink,
  getMetadata,
  handleStreaming,
  searchTorrents,
  handleShortService,
  handleShortStats,
} from './controller/torrent.js';

import {
  registerNewUser,
  login,
  getUsers,
  authGoogle,
  verifyOtpforPhone,
  sendOtp,
  googleSignIn
} from './controller/user.js';

import upload from './utils/multerConfig.js'; // ✅ new multer import

import { getAdminUploads } from './controller/channel.js';
import { submitFeedback } from "./controller/channel.js";
import db from './database/config.js';
import { uploads } from './database/schema.js';

const router = express.Router();

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android App Links verification (host at https://teleplay.in/.well-known/assetlinks.json)
router.get("/.well-known/assetlinks.json", (req, res) => {
  const packageName = process.env.ANDROID_APP_PACKAGE_NAME || "com.semilshah.teleplay";
  const fromEnv = process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS || "";
  const fingerprints = fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sha256CertFingerprints = fingerprints.length
    ? fingerprints
    : [
        // Default (debug.keystore in this repo). Replace in production.
        "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
      ];

  return res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: sha256CertFingerprints,
      },
    },
  ]);
});

router.get('/health', (req, res) => res.sendStatus(200));

router.post('/user/register', registerNewUser);
router.post('/user/login', login);
router.post('/user/google-signin', googleSignIn); // Google OAuth for mobile app
router.get('/users', getUsers);
router.get('/auth/google', authGoogle);
router.get('/auth/google/callback', () => {}); // Fill this out

// Torrent-related routes
router.get('/metadata', getMetadata);
// NOTE: unified /stream router is defined below; remove legacy handler to avoid conflicts
// router.get('/stream', handleStreaming);
router.get('/search', searchTorrents);

// File Upload Routes
router.post('/content/uploadPost', upload.single('thumbnail'), handleUpload);


router.get("/s/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const acceptHeader = (req.headers["accept"] || "").toString();
    const wantsJson =
      req.query.json === "1" || acceptHeader.includes("application/json");

    const result = await db
      .select({
        id: uploads.id,
        inputLink: uploads.input_link,
        outputLink: uploads.output_link,
        title: uploads.title,
        description: uploads.description,
        language: uploads.language,
      })
      .from(uploads)
      .where(like(uploads.output_link, `%${code}%`))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ message: "Short link not found" });
    }

    const record = result[0];
    const originalLink = record.inputLink;
    const title = record.title || 'Teleplay Content';

    if (wantsJson) {
      return res.status(200).json({
        code,
        uploadId: record.id,
        title,
        description: record.description || null,
        language: record.language || null,
        inputLink: record.inputLink || null,
        outputLink: record.outputLink || null,
      });
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);

    if (isMobile) {
      const deepLink = `teleplay://watch/${code}?title=${encodeURIComponent(title)}`;
      const fallback = originalLink || record.outputLink;

      return res
        .status(200)
        .set('Content-Type', 'text/html')
        .send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Teleplay Link</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, sans-serif; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; text-align:center; }
      a { color:#4ea1ff; text-decoration:none; font-weight:600; }
      .box { max-width:320px; padding:24px; border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:rgba(0,0,0,0.4); }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Opening Teleplay</h1>
      <p>If the app doesn't open automatically, <a href="${deepLink}">tap here</a>.</p>
      <p>Need fallback? <a href="${fallback}">Open in browser</a></p>
    </div>
    <script>
      function launch() {
        window.location = "${deepLink}";
        setTimeout(function () {
          window.location = "${fallback}";
        }, 1500);
      }
      launch();
    </script>
  </body>
</html>`);
    }

    if (originalLink?.startsWith('magnet:')) {
      req.body = { ...(req.body || {}), link: originalLink };
      return handleTorrentStream(req, res);
    }

    if (originalLink) {
      return res.redirect(originalLink);
    }

    return res.status(404).json({ message: "Original link missing" });
  } catch (err) {
    console.error('Short link stream error:', err);
    res.status(500).json({ message: "Server error" });
  }
});


// Short link service
router.post('/generate/short', upload.single('thumbnail'), generateShortLink); // also using multer
router.get('/short/:uid', handleShortService);
router.get('/short/stats/:uid', handleShortStats);

// GET /api/shortlink/:id
router.get("/shortlink/:id", getShortLinkById);

// POST /api/qrcode/generate - Generate QR code for any URL
router.post("/qrcode/generate", generateQRCode);


// Channel-related routes
router.patch('/channel/profile', updateChannelProfile);
router.get('/channel/profile', getChannelProfile);
router.get('/content/:channelId', handleChannelContent);
router.get('/latest/content/:channelId', handleLatestContent);
router.delete('/content/:uid', handleDeleteContent);
router.post('/channel/create', createNewChannel);
router.post('/channel/login', channelLogin);
router.get('/channel/all', getAllChannels);
router.post('/channel/subscribe', channelSubscribe);
router.post('/channel/unsubscribe', channelUnSubscribe);
router.post('/channel/forgotpassword', forgotPassword);
router.post('/otpVerification', verifyOtp);
router.patch('/updatePassword', updatePassword);
router.get('/admin/uploads', getAdminUploads);
router.post('/admin/sub', handleSubscription);
router.post('/admin/desub', handleDesub);
router.post("/channel/feedback", submitFeedback);
router.patch('/channel/update-password', newUpdatePassword);


// ✅ search channels & content (GET /api/search?query=word)
router.get("/channel/search", searchChannels);

//  get channel by there id
router.get('/channel/:id', getChannelById);
// routes/channel.js (or wherever your routes are defined)
router.get('/channel/subscriptions/:userId', channelSubscriptions);

// OTP
router.post('/sendOTP', sendOtp); // ✅ POST, 
router.post('/verifyOTP',verifyOtpforPhone)

// router.post('/upload/profile-image', upload.single('file'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const fileUrl = `http://localhost:9898/uploads/${req.file.filename}`; // Adjust your port if needed
//   res.status(200).json({ url: fileUrl });
// });


router.post("/upload/profile-image", upload.single("file"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  if (!req.file.mimetype?.startsWith("image/")) {
    return res.status(400).json({ message: "Only image uploads are allowed" });
  }

  try {
    const uploadDir = path.join(__dirname, "utils/upload");
    await fs.mkdir(uploadDir, { recursive: true });

    const extFromMime = req.file.mimetype.split("/")[1] || "png";
    const safeExt = extFromMime.replace(/[^a-z0-9]/gi, "") || "png";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

    await fs.writeFile(path.join(uploadDir, filename), req.file.buffer);

    // Return a path that the frontend can resolve against `VITE_BASE_URL`
    return res.status(200).json({ url: `/utils/upload/${filename}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});



router.get("/channel/profile", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization); // parse token
    const [user] = await db.select().from(channels).where(eq(channels.user_id, userId));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});




router.get('/uploads/:id', getUploadById)

router.patch('/content/uploadPost/:id', upload.single('thumbnail'), handleUpdateUpload);

// router.get('/api/uploads/recent/:adminId', handleRecentUploads);



















// The following api are for Video Streaming

// Main /stream route: decides based on link type
router.all('/stream', async (req, res) => {
  let link = req.body.link || req.query.link;
  if (!link) return res.status(400).json({ error: 'Link is required' });

  try {
    if (!link.startsWith('magnet:')) {
      const resolved = await resolveShortLinkToOriginal(link);
      if (resolved) {
        link = resolved;
        req.body = { ...(req.body || {}), link: resolved };
        req.query = { ...(req.query || {}), link: resolved };
      }
    }

    if (link.startsWith('magnet:')) await handleTorrentStream(req, res);
    else if (link.includes('drive.google.com')) await handleGoogleDrive(req, res);
    else if (link.includes('dropbox.com')) await handleDropbox(req, res);
    else if (link.includes('pcloud')) await handlePCloud(req, res);
    else if (link.includes('icedrive')) await handleIcedrive(req, res);
    else if (link.includes('mega.nz')) handleMega(req, res);
    else res.status(400).json({ error: 'Unsupported link type' });
  } catch (error) {
    console.error('Error routing link:', error.message);
    res.status(500).json({ error: 'Failed to process the link' });
  }
});

// Torrent file streaming
router.get('/stream/torrent/:filename', streamTorrentFile);


// Health check
// router.get('/healthForStreaming', (req, res) => {
//   res.status(200).json({ message: 'I am running, happy coding!' });
// });

router.get('/healthForStreaming', (req, res) => res.sendStatus(200));

export default router;
