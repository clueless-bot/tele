import Queries from '../database/queries.js';
import crypto from "crypto";
import dotenv from 'dotenv';
import path from 'path';
import db from '../database/config.js';
import { shortLinks } from '../database/schema.js';
import { uploads, watchHistory } from '../database/schema.js';
import { eq, sql, and, like, desc } from 'drizzle-orm';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';
import { unlinkFile } from '../utils/utils.js';
import axios from 'axios';
import { response } from 'express';
import jwt from 'jsonwebtoken'
import { channels, users, subscriptions } from '../database/schema.js';
import { feedback } from '../database/schema.js';
// const crypto = require('crypto');


// controllers/streamControllers.js
import WebTorrent from 'webtorrent';
import { File } from 'megajs';
import { getFfmpegBinary } from '../services/mediaPipeline.js';




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars even when server is started from different working directories.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

/**
 * Create New Channel
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */


// export async function createNewChannel(req, res) {
//   const { name, phoneNumber, email, password } = req.body;
// //this
//   // const existingUser = await Queries.doesEmailAlreadyExists(email);
//   // if (!existingUser.length) {
//   //   return res.status(404).json({
//   //     message: 'User does not exists in our system.'
//   //   });
//   // }

//   const existingChannel = await Queries.doesChannelAlreadyExists(email)
//   if (existingChannel.length) {
//     return res.status(409).json({
//       message: 'Channel already exists'
//     });
//   }

//   const hashedPassword = crypto
//     .createHash('sha256')
//     .update(password)
//     .digest('hex');

//     //this

//   // WRITE YOUR OTP GENERATOR CODE OVER HERE

//   // Resend OTP function
//   const otp = Math.floor(100000 + Math.random() * 900000);
//   console.log(otp);
  
//   // WRITE EMAIL API HERE


// const mailerSend = new MailerSend({
//   apiKey: process.env.MAIL_KEY,
// });

// const sentFrom = new Sender("MS_ROBhb5@trial-zxk54v8zwk1ljy6v.mlsender.net", "Test OTP");

// const recipients = [
//   new Recipient(email, name)
// ];

// const emailParams = new EmailParams()
//   .setFrom(sentFrom)
//   .setTo(recipients)
//   .setReplyTo(sentFrom)
//   .setSubject("This is a Subject")
//   .setHtml("<strong>This is the HTML content</strong>")
//   .setText("This is the text content");

// await mailerSend.email.send(emailParams);


// console.log("object")

//   const channel = await Queries.createNewChannel(name, email, phoneNumber, hashedPassword, otp);
//   console.log(otp)
//   if (!channel) {
//     res.status(500).send('Adding user to DB was unsuccessful!');
//     return;
//   }

//   res.status(201).json({ message: "channel created successfully" });

// }


export async function createNewChannel(req, res) {
  try {
    const { name,username,email, phoneNumber , password,otp } = req.body;

    // Check if channel exists
    const existingChannel = await Queries.doesChannelAlreadyExists(email);
    if (existingChannel.length) {
      return res.status(409).json({ message: 'Channel already exists' });
    }

    // Hash password
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    const channel = await Queries.createNewChannel(
      name, 
      email, 
      phoneNumber, 
      hashedPassword, 
      otp,
      username,
    );

    if (!channel) {
      return res.status(500).send('Adding user to DB was unsuccessful!');
    }

    res.status(201).json({ message: "Channel created successfully" });

  } catch (error) {
    console.error('Error in createNewChannel:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

/**
 * Channel Login
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

// export async function channelLogin(req, res) {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "All fields are required" });
//   }

//   try {
//     const existingChannel = await Queries.doesChannelAlreadyExists(email);

//     if (!existingChannel.length) {
//       return res.status(400).json({ message: "Channel does not exist" });
//     }

//     const channel = existingChannel[0];
//     const hashedPassword = crypto
//       .createHash('sha256')
//       .update(password)
//       .digest('hex');

//     if (channel?.password !== hashedPassword) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Create JWT token
//     const token = jwt.sign(
//       { channelId: channel.id, email: channel.email },
//       process.env.JWT_SECRET || 'your_fallback_secret_key',
//       { expiresIn: '1h' }
      
//     );

//     // Remove sensitive data before sending response
//     const { password: _, ...channelData } = channel;

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       channel: channelData
//     });

//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// }

export async function channelLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingChannel = await Queries.doesChannelAlreadyExists(email);

    if (!existingChannel.length) {
      return res.status(400).json({ message: "Channel does not exist" });
    }

    const channel = existingChannel[0];
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (channel?.password !== hashedPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT token with extended expiration time
    const token = jwt.sign(
      { channelId: channel.id, email: channel.email },
      process.env.JWT_SECRET_KEY || 'your_fallback_secret_key',
      { expiresIn: '70d' } // Token now expires in 7 days
    );

    // Remove sensitive data before sending response
    const { password: _, ...channelData } = channel;

    res.status(200).json({
      message: "Login successful",
      token,
      channel: channelData,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function forgotPassword(req, res) {
  const { email, otp } = req.body;
  const user = await Queries.doesChannelAlreadyExists(email);

  try {

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

      Queries.updateUserOTP(email, otp); 
      res.status(200).send("done"); 
      } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  const user = await Queries.doesChannelAlreadyExists(email);

  try { 

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

      const userOTP = await Queries.fetchUserOTP(email); 
      if (userOTP.otp == otp){
        return res.status(200).send("verified otp")
      } 
      else{
        return res.status(401).send("otp verification failed")
      }
      } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updatePassword(req, res) {
  const { email, password } = req.body;
  const user = await Queries.doesChannelAlreadyExists(email);

  const hashedPassword = crypto
  .createHash('sha256')
  .update(password)
  .digest('hex');

  try {

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    } 
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    

      Queries.updatePassword(email, hashedPassword); 
      res.status(200).send("password updated")
      } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Retrieves the channel content for a particular channel
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

export async function handleChannelContent1(req, res) {
  console.log("handele channel content")
  const { channelId } = req.params;
  if (!channelId) {
    res.status(404).json({ message: "invalid channel Id" });
    return;
  }

  try {
    const channelContent = await Queries.retrieveChannelContent(channelId)
    if (!channelContent.length) {
      res.status(400).json({ message: "could not find content for this channel" })
      return
    }

    res.status(200).json({ content: channelContent })
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "error retrieving content" })
  }

}

export async function handleChannelContent(req, res) {
  console.log("handle channel content")
  const { channelId } = req.params;

  // Check if channelId exists and is a number
  if (!channelId || isNaN(Number(channelId))) {
    res.status(400).json({ message: "Invalid channelId" });
    return;
  }

  try {
    const channelContent = await Queries.retrieveChannelContent(Number(channelId));
    if (!channelContent.length) {
      res.status(404).json({ message: "Could not find content for this channel" });
      return;
    }
    res.status(200).json({ content: channelContent });
  } catch (e) {
    console.log("Error retrieving channel content:", e);
    res.status(500).json({ message: "Error retrieving content" });
  }
}

/**
 * Retrieves the latest channel content for a particular channel
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

export async function handleLatestContent(req, res) {
  const { channelId } = req.params;
  if (!channelId) {
    res.status(404).json({ message: "invalid channel Id" });
    return;
  }

  try {
    const channelContent = await Queries.retrieveLatestContent(channelId)
    if (!channelContent.length) {
      res.status(400).json({ message: "could not find content for this channel" })
      return
    }

    res.status(200).json({ content: channelContent })
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "error retrieving content" })
  }

}

/**
 * delete the channel channel content for a particular channel
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

export async function handleDeleteContent(req, res) {
  const { uid } = req.params;
  if (!uid) {
    res.status(404).json({ message: "short link is required" });
    return
  }

  const short = await db.select().from(shortLinks).where(eq(shortLinks.uid, uid))
  console.log(short)
  if (!short.length) {
    res.status(404).json({ message: "content not found" })
    return
  }

  try {
    const response = await Queries.deleteChannelContent(uid)
    console.log(response)
    const filePath = path.join(__dirname, "..", `/utils/upload/${response[0]?.fileUrl}`)
    if (filePath) {
      await unlinkFile(filePath)
    }
    res.status(200).json({ message: "content deleted successfully" });
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: "error deleting content", err: e })
  }


}

/**
 * subscribe the channel 
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

// export async function channelSubscribe1(req, res) {
//   console.log("subscribe called")
//   const { userId, channelId } = req.body;

//   // existing 
//   const existing = await Queries.isUserSubscribed(userId, channelId);
//   if (existing.length) {
//     return res.status(409).json({
//       message: 'user already subscribed to the channel'
//     });
//   }


//   const subscribe = await Queries.susbcribeChannel(userId, channelId);
//   if (!subscribe) {
//     res.status(500).send('Unable to subscribe to the channel');
//     return;
//   }

//   res.status(201).json({ message: "subscribed successfully" });

// }

export async function channelSubscribe(req, res) {
  console.log("subscribe called", req.body);

  try {
    const authenticatedUserId = Number(req.user?.userId);
    let { channelId } = req.body;

    if (!Number.isInteger(authenticatedUserId) || authenticatedUserId <= 0) {
      return res.status(401).json({ message: 'Authentication is required' });
    }

    const userId = authenticatedUserId;

    // Validate input exists
    if (channelId === undefined) {
      return res.status(400).json({ 
        message: "channelId is required",
        received: { channelId }
      });
    }

    // Convert the requested channel ID safely; the user ID came from the JWT.
    channelId = parseInt(channelId, 10);

    // Validate conversion was successful
    if (isNaN(channelId) || channelId <= 0) {
      return res.status(400).json({ 
        message: "Invalid channelId. It must be a positive integer.",
        received: { channelId: req.body.channelId }
      });
    }

    console.log(`Checking subscription for userId: ${userId}, channelId: ${channelId}`);

    // Check if already subscribed
    const existing = await Queries.isUserSubscribed(userId, channelId);
    if (existing && existing.length > 0) {
      console.log(`User ${userId} is already subscribed to channel ${channelId}`);
      return res.status(409).json({
        message: 'user already subscribed to the channel'
      });
    }

    // Subscribe to channel
    console.log(`Subscribing user ${userId} to channel ${channelId}`);
    const subscribe = await Queries.susbcribeChannel(userId, channelId);
    
    if (!subscribe) {
      console.error(`Failed to subscribe user ${userId} to channel ${channelId}`);
      return res.status(500).json({ 
        message: 'Unable to subscribe to the channel',
        error: 'Database insertion failed'
      });
    }

    console.log(`Successfully subscribed user ${userId} to channel ${channelId}`, subscribe);
    return res.status(201).json({ 
      message: "subscribed successfully",
      subscription: subscribe
    });
  } catch (error) {
    console.error("Error in channelSubscribe:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
}


// controller/channelController.js
export async function channelSubscriptions(req, res) {
  const { userId } = req.params;

  try {
    const authenticatedUserId = Number(req.user?.userId);
    const userIdInt = userId === 'me' ? authenticatedUserId : parseInt(userId, 10);
    
    if (isNaN(userIdInt) || userIdInt <= 0 || !Number.isInteger(authenticatedUserId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        received: userId 
      });
    }

    if (userIdInt !== authenticatedUserId) {
      return res.status(403).json({ message: 'You can only view your own subscriptions' });
    }

    console.log('Fetching subscriptions for user:', userIdInt);
    const subscriptions = await Queries.getUserSubscriptions(userIdInt);

    console.log(`Found ${subscriptions?.length || 0} subscriptions for user ${userIdInt}`);
    return res.status(200).json({ subscriptions: subscriptions || [] });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    return res.status(500).json({ 
      message: 'Error fetching subscriptions',
      error: err.message 
    });
  }
}

export async function channelSubscriptionStatus(req, res) {
  const { id: channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({ message: 'channelId is required' });
  }

  try {
    const authenticatedUserId = Number(req.user?.userId);
    if (!Number.isInteger(authenticatedUserId)) {
      return res.status(401).json({ message: 'Authentication is required' });
    }
    const existing = await Queries.isUserSubscribed(authenticatedUserId, channelId);
    return res.status(200).json({ subscribed: Boolean(existing?.length) });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return res.status(500).json({ message: 'Unable to check subscription status' });
  }
}


/**
 * unsubscribe the channel 
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */

export async function channelUnSubscribe(req, res) {
  const { channelId } = req.body;
  const authenticatedUserId = Number(req.user?.userId);

  if (!Number.isInteger(authenticatedUserId)) {
    return res.status(401).json({ message: 'Authentication is required' });
  }

  // existing 
  const existing = await Queries.isUserSubscribed(authenticatedUserId, channelId);
  if (!existing?.length) {
    return res.status(400).json({
      message: 'user not subscribed to the channel'
    });
  }

  const unsubscribe = await Queries.unsubscribeChannel(existing[0]?.id);
  console.log(unsubscribe);
  if (!unsubscribe?.length) {
    res.status(500).send({ message: "unable to unsubscribe" });
    return;
  }

  res.status(201).json({ message: "unsubscribed successfully" });
}


// export const handleUpload = async (req, res) => {
//   try {
//     // Check if admin_id exists before converting
//     if (!req.body.admin_id) {
//       return res.status(400).json({ 
//         message: 'admin_id is required for upload'
//       });
//     }

//     // Convert string IDs to BigInt
//     const token = req.body.admin_id;
//     const customerId = req.body.customer_id ? BigInt(req.body.customer_id) : null;

// const secretKey = 'your_fallback_secret_key'; // Same key used for signing
// const decoded = jwt.verify(token, secretKey);


// console.log(decoded, typeof(decoded), decoded.channelId)
//     await db.insert(uploads).values({
//       admin_id: decoded.channelId,
//       customer_id: 7,
//       thumbnail: req.file.buffer,
//       title: req.body.title,
//       input_link: req.body.input_link,
//       language: req.body.language,
//       description: req.body.description,
//       tags: req.body.tags || 'avdadv',
//       output_link: req.body.output_link || 'ava',
//     });

//     return res.status(201).json({ message: 'Upload successful.' });
//   } catch (error) {
//     console.error('Upload error:', error);
//     return res.status(500).json({ 
//       message: 'Internal Server Error',
//       error: error.message 
//     });
//   }
// };

export const handleUpload1 = async (req, res) => {
  try {
    // Check if admin_id exists before converting
    if (!req.body.admin_id) {
      return res.status(400).json({ 
        message: 'admin_id is required for upload'
      });
    }

    const adminId = req.body.admin_id; // plain ID

    // Decode JWT token
    // const token = req.body.admin_id;
    // const secretKey = process.env.JWT_SECRET_KEY || 'your_fallback_secret_key'; // Same key used for signing
    // const decoded = jwt.verify(token, secretKey);

    // console.log(decoded, typeof(decoded), decoded.channelId);

    // await db.insert(uploads).values({
    //   admin_id: decoded.channelId,
    //   customer_ids: req.body.customer_id ? req.body.customer_id : 7,
    //   thumbnail: req.file.buffer,
    //   title: req.body.title,
    //   input_link: req.body.input_link,
    //   language: req.body.language,
    //   description: req.body.description,
    //   tags: req.body.tags || 'default_tag',
    //   output_link: req.body.output_link || 'defaultavasva_output',
    // });


    await db.insert(uploads).values({
      // admin_id: decoded.channelId,
      admin_id: adminId,
      customer_ids: Array.isArray(req.body.customer_id) 
                      ? req.body.customer_id 
                      : [req.body.customer_id || 7], // wrap in array
      thumbnail: req.file.buffer,
      title: req.body.title,
      input_link: req.body.input_link,
      language: req.body.language,
      description: req.body.description,
      tags: Array.isArray(req.body.tags) 
              ? req.body.tags 
              : [req.body.tags || 'default_tag'], // wrap in array
      output_link: req.body.output_link || 'defaultavasva_output',
    });

    

    return res.status(201).json({ message: 'Upload successful.' });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
};


// Improved short code generator with collision detection
async function generateShortCode(length = 6, maxAttempts = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists in uploads table
    const existing = await db.select()
      .from(uploads)
      .where(sql`${uploads.output_link} LIKE ${`%${result}%`}`)
      .limit(1);
    
    if (existing.length === 0) {
      return result;
    }
  }
  
  // If all attempts failed, try with longer code
  return generateShortCode(length + 1, maxAttempts);
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  return value.trim().replace(/\/+$/, '');
}

function resolveBaseUrl(req) {
  const candidates = [
    normalizeBaseUrl(process.env.SHORT_LINK_BASE_URL),
    normalizeBaseUrl(process.env.SERVER_URL),
    normalizeBaseUrl(process.env.BASE_URL),
  ];

  for (const url of candidates) {
    if (url) return url;
  }

  const protocol =
    req.headers['x-forwarded-proto']?.toString().split(',')[0] ||
    req.protocol ||
    'http';
  const host =
    req.headers['x-forwarded-host']?.toString().split(',')[0] ||
    req.headers.host;

  if (host) {
    return `${protocol}://${host}`.replace(/\/+$/, '');
  }

  return 'https://teleplay.com';
}

function resolveRequestBaseUrl(req) {
  const protocol =
    req.headers['x-forwarded-proto']?.toString().split(',')[0] ||
    req.protocol ||
    'http';
  const host =
    req.headers['x-forwarded-host']?.toString().split(',')[0] ||
    req.headers.host;

  if (!host) return null;
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function resolvePublicAssetUrl(req, assetPath) {
  if (!assetPath) return assetPath;
  const value = String(assetPath);

  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      // If older data stored localhost URLs, rewrite them to the current public origin.
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
        const baseUrl = resolveRequestBaseUrl(req) || resolveBaseUrl(req);
        return new URL(parsed.pathname + parsed.search, baseUrl).toString();
      }
      return value;
    } catch {
      return value;
    }
  }

  // Prefer the request's public origin (works behind proxies like ngrok),
  // then fall back to configured BASE_URLs.
  const baseUrl = resolveRequestBaseUrl(req) || resolveBaseUrl(req);
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return new URL(normalized, baseUrl).toString();
}

function extractShortCode(value) {
  if (!value) return null;
  let candidate = value.trim();

  try {
    const parsed = new URL(candidate);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length) {
      candidate = segments[segments.length - 1];
    }
  } catch {
    // Not a full URL, fall through
  }

  const parts = candidate.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

export async function resolveShortLinkToOriginal(shortInput) {
  const code = extractShortCode(shortInput);
  if (!code) return null;

  // First: look in uploads table for matching output_link
  const uploadMatch = await db
    .select({ inputLink: uploads.input_link })
    .from(uploads)
    .where(like(uploads.output_link, `%${code}`))
    .limit(1);
  if (uploadMatch?.[0]?.inputLink) {
    return uploadMatch[0].inputLink;
  }

  // Fallback: look in legacy shortLinks table
  const [shortRecord] = await db
    .select({ magnet: shortLinks.magnet })
    .from(shortLinks)
    .where(eq(shortLinks.uid, code))
    .limit(1);

  return shortRecord?.magnet || null;
}

export const handleUpload = async (req, res) => {
  try {
    // Check if admin_id exists before converting
    if (!req.body.admin_id) {
      return res.status(400).json({
        message: "admin_id is required for upload",
      });
    }

    // Decode token → get channelId (real admin_id)
    let decoded;
    try {
      decoded = jwt.verify(req.body.admin_id, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const adminId = parseInt(decoded.channelId, 10); // 👈 use actual id from token

    console.log("adminId", adminId);
    // Original link
    const originalLink = req.body.input_link;

    // Generate short code + short link with collision detection
    const shortCode = await generateShortCode(6);
    const baseUrl = resolveBaseUrl(req);
    const shortLink = `${baseUrl}/s/${shortCode}`;

    // Ensure we have a proper Buffer
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "Thumbnail file is required",
      });
    }

    // Convert buffer to base64 string for TEXT storage
    const thumbnailBase64 = Buffer.isBuffer(req.file.buffer) 
      ? req.file.buffer.toString('base64')
      : Buffer.from(req.file.buffer).toString('base64');

    // Handle tags - it's a varchar, not an array, so convert array to string
    const tagsValue = Array.isArray(req.body.tags) 
      ? req.body.tags.join(', ') 
      : (req.body.tags || "default_tag");

    // Handle customer_ids - ensure it's an array of integers
    const customerIdsArray = Array.isArray(req.body.customer_id)
      ? req.body.customer_id
      : [req.body.customer_id || 7];

    // Insert using Drizzle now that thumbnail is TEXT (base64 string)
    const insertResult = await db.insert(uploads).values({
      admin_id: adminId,
      customer_ids: customerIdsArray,
      thumbnail: thumbnailBase64, // Now storing as base64 text string
      title: req.body.title,
      input_link: originalLink,
      language: req.body.language,
      description: req.body.description,
      tags: tagsValue,
      output_link: shortLink || 'defaultavasva_output',
    }).returning({ id: uploads.id });

    const uploadId = insertResult[0]?.id || null;

    // Generate QR code for the short link
    let qrCodeDataUrl = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(shortLink, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      console.error("Error generating QR code:", qrError);
      // Continue without QR code if generation fails
    }

    return res.status(201).json({
      message: "Upload successful.",
      shortUrl: shortLink, // return full shortened link in response
      qrCode: qrCodeDataUrl, // return QR code as base64 data URL
      uploadId: uploadId, // return upload ID
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



// Generate QR code for a short link
export const generateQRCode = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return res.status(200).json({
      qrCode: qrCodeDataUrl,
      url: url
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({
      message: "Error generating QR code",
      error: error.message
    });
  }
};

// get short link by id
export const getShortLinkById = async (req, res) => {
  try {
    const uploadId = parseInt(req.params.id, 10);

    if (isNaN(uploadId)) {
      return res.status(400).json({ message: "Invalid upload ID" });
    }

    const result = await db
      .select({ shortUrl: uploads.output_link })
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ message: "Upload not found" });
    }

    res.json({ shortUrl: result[0].shortUrl });
  } catch (err) {
    console.error("Fetch short link error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};




// Example login response handler
export const handleLogin = async (email, password) => {
  try {
    const response = await fetch('http://localhost:9898/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (data.token) {
      // Store the token in localStorage or a secure cookie
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard/content page
      window.location.href = '/dashboard';
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};  


export const getAdminUploads = async (req, res) => {
  try {
    // Extract admin ID from authenticated user session
    const token = req.header('Authorization');
    const secretKey = process.env.JWT_SECRET_KEY || 'your_fallback_secret_key'; // Same key used for signing
    const decoded = jwt.verify(token, secretKey);

    if (!decoded.channelId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required or invalid channel ID' 
      });
    }
    
    // Query uploads table for all entries with matching admin_id
    const uploadsList = await db.select({
      id: uploads.id,
      admin_id: uploads.admin_id,
      customer_ids: uploads.customer_ids,
      title: uploads.title,
      input_link: uploads.input_link,
      output_link: uploads.output_link,
      language: uploads.language,
      description: uploads.description,
      tags: uploads.tags,
      thumbnail: uploads.thumbnail,
      views: uploads.views,
      subscription_status: uploads.subscription_status
    })
    .from(uploads)
    .where(eq(uploads.admin_id, decoded.channelId));
    
    // Process the thumbnails to be usable in frontend
    // thumbnail is now stored as base64 text, just add data URL prefix
    const processedUploads = uploadsList.map(upload => {
      const base64Thumbnail = upload.thumbnail 
        ? (upload.thumbnail.startsWith('data:') ? upload.thumbnail : `data:image/jpeg;base64,${upload.thumbnail}`)
        : null;
      
      return {
        ...upload,
        thumbnail: base64Thumbnail,
      };
    });
    
    return res.status(200).json({
      success: true,
      data: processedUploads
    });
  } catch (error) {
    console.error('Error fetching admin uploads:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Public discovery feed: intentionally does not use subscription state. It
// lets every viewer discover published videos from every channel.
export const getDiscoverUploads = async (_req, res) => {
  try {
    const discovered = await db
      .select({
        id: uploads.id,
        admin_id: uploads.admin_id,
        title: uploads.title,
        input_link: uploads.input_link,
        output_link: uploads.output_link,
        language: uploads.language,
        description: uploads.description,
        tags: uploads.tags,
        thumbnail: uploads.thumbnail,
        views: uploads.views,
        createdAt: uploads.createdAt,
        channel_name: channels.name,
        channel_username: channels.username,
      })
      .from(uploads)
      .leftJoin(channels, eq(uploads.admin_id, channels.id))
      .orderBy(desc(uploads.createdAt), desc(uploads.id))
      .limit(100);

    return res.status(200).json({
      success: true,
      data: discovered.map((upload) => ({
        ...upload,
        thumbnail: upload.thumbnail
          ? (upload.thumbnail.startsWith('data:') ? upload.thumbnail : `data:image/jpeg;base64,${upload.thumbnail}`)
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching discovery uploads:', error);
    return res.status(500).json({ success: false, message: 'Unable to load discovery videos' });
  }
};

const historyItemFromRequest = (body = {}) => ({
  contentKey: typeof body.contentKey === 'string' ? body.contentKey.trim() : '',
  uploadId: Number.isInteger(Number(body.uploadId)) && Number(body.uploadId) > 0 ? Number(body.uploadId) : null,
  title: typeof body.title === 'string' ? body.title.trim().slice(0, 255) : '',
  thumbnail: typeof body.thumbnail === 'string' ? body.thumbnail : null,
  inputLink: typeof body.input_link === 'string' ? body.input_link : typeof body.inputLink === 'string' ? body.inputLink : null,
  outputLink: typeof body.output_link === 'string' ? body.output_link : typeof body.outputLink === 'string' ? body.outputLink : null,
  description: typeof body.description === 'string' ? body.description : null,
  language: typeof body.language === 'string' ? body.language.slice(0, 50) : null,
});

export const saveWatchHistory = async (req, res) => {
  const userId = Number(req.user?.userId);
  const item = historyItemFromRequest(req.body);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: 'Authentication required' });
  if (!item.contentKey || !item.title) return res.status(400).json({ message: 'A video identifier and title are required' });

  try {
    const [saved] = await db.insert(watchHistory).values({ userId, ...item, watchedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: [watchHistory.userId, watchHistory.contentKey],
        set: { ...item, watchedAt: new Date().toISOString() },
      })
      .returning();
    return res.status(201).json({ history: saved });
  } catch (error) {
    console.error('Error saving watch history:', error);
    return res.status(500).json({ message: 'Unable to save watch history' });
  }
};

export const getWatchHistory = async (req, res) => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: 'Authentication required' });
  try {
    const history = await db.select({
      id: watchHistory.id, userId: watchHistory.userId, uploadId: watchHistory.uploadId,
      contentKey: watchHistory.contentKey, title: watchHistory.title,
      thumbnail: sql`COALESCE(NULLIF(${watchHistory.thumbnail}, ''), ${uploads.thumbnail})`,
      inputLink: watchHistory.inputLink, outputLink: watchHistory.outputLink,
      description: watchHistory.description, language: watchHistory.language, watchedAt: watchHistory.watchedAt,
    }).from(watchHistory)
      .leftJoin(uploads, eq(watchHistory.uploadId, uploads.id))
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.watchedAt))
      .limit(100);
    return res.json({ history: history.map((item) => ({
      ...item,
      thumbnail: item.thumbnail
        ? (String(item.thumbnail).startsWith('data:') ? item.thumbnail : `data:image/jpeg;base64,${item.thumbnail}`)
        : null,
      historyId: item.id,
      id: item.uploadId ?? item.contentKey,
      upload_id: item.uploadId,
    })) });
  } catch (error) {
    console.error('Error loading watch history:', error);
    return res.status(500).json({ message: 'Unable to load watch history' });
  }
};

export const deleteWatchHistory = async (req, res) => {
  const userId = Number(req.user?.userId);
  const historyId = Number(req.params.id);
  if (!Number.isInteger(userId) || !Number.isInteger(historyId)) return res.status(400).json({ message: 'Invalid history item' });
  try {
    const deleted = await db.delete(watchHistory).where(and(eq(watchHistory.id, historyId), eq(watchHistory.userId, userId))).returning({ id: watchHistory.id });
    if (!deleted.length) return res.status(404).json({ message: 'History item not found' });
    return res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting watch history:', error);
    return res.status(500).json({ message: 'Unable to delete history item' });
  }
};

// Count a view only after the mobile player has actually started playback.
// The atomic increment prevents lost updates when many viewers start together.
export const incrementUploadView = async (req, res) => {
  const uploadId = Number(req.params.id);
  if (!Number.isInteger(uploadId) || uploadId <= 0) {
    return res.status(400).json({ message: 'Invalid upload ID' });
  }

  try {
    const [updated] = await db
      .update(uploads)
      .set({ views: sql`COALESCE(${uploads.views}, 0) + 1` })
      .where(eq(uploads.id, uploadId))
      .returning({ id: uploads.id, views: uploads.views });

    if (!updated) return res.status(404).json({ message: 'Upload not found' });
    return res.status(200).json({ uploadId: updated.id, views: updated.views });
  } catch (error) {
    console.error('Error recording upload view:', error);
    return res.status(500).json({ message: 'Unable to record view' });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { message, channelId } = req.body;

    // Validate and parse channelId
    const parsedChannelId = channelId ? parseInt(channelId, 10) : null;
    if (isNaN(parsedChannelId)) {
      return res.status(400).json({ message: 'Invalid channel ID' });
    }

    // Insert into database
    await db.insert(feedback).values({
      message,
      channelId: parsedChannelId,
    });

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export async function handleRecentUploads(req, res) {
  const { channelId } = req.params;

  try {
    const recentUploads = await db.select()
      .from(uploads)
      .where(eq(uploads.admin_id, channelId))
      .orderBy(sql`created_at DESC`)
      .limit(3);

    if (!recentUploads.length) {
      return res.status(404).json({ message: "No uploads found" });
    }

    // thumbnail is now stored as base64 text, just add data URL prefix if needed
    const processedUploads = recentUploads.map(upload => ({
      ...upload,
      thumbnail: upload.thumbnail 
        ? (upload.thumbnail.startsWith('data:') ? upload.thumbnail : `data:image/jpeg;base64,${upload.thumbnail}`)
        : null
    }));

    res.status(200).json({ uploads: processedUploads });
  } catch (error) {
    console.error("Error fetching recent uploads:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}





export const handleSubscription = async (req, res) => {
  try {
    // Check if admin_id exists before converting
    if (!req.body.admin_id) {
      return res.status(400).json({ 
        message: 'admin_id is required for upload'
      });
    }

    // Decode JWT token
    const token = req.body.admin_id;
    const secretKey = process.env.JWT_SECRET_KEY || 'your_fallback_secret_key'; // Same key used for signing
    const decoded = jwt.verify(token, secretKey);

    // console.log(decoded, typeof(decoded), decoded.channelId);

    await db
    .update(uploads)
    .set({
      subscription_status: true,
      customer_ids: sql`array_append(
        coalesce(${uploads.customer_ids}, '{}'::int[]), 
        ${parseInt(req.body.customer_id)}::int
      )`    })    .where(
      and( // Use `and` to combine conditions
        eq(uploads.admin_id, decoded.channelId),
        eq(uploads.id, req.body.id) // Replace `id` with your primary key column
      )
    );

    return res.status(201).json({ message: 'Upload successful.' });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
};


export const handleDesub = async (req, res) => {
  try {
    // Check if admin_id exists before converting
    if (!req.body.admin_id) {
      return res.status(400).json({ 
        message: 'admin_id is required for upload'
      });
    }

    // Decode JWT token
    const token = req.body.admin_id;
    const secretKey = process.env.JWT_SECRET_KEY || 'your_fallback_secret_key'; // Same key used for signing
    console.log(secretKey)

    const decoded = jwt.verify(token, secretKey);

    // console.log(decoded, typeof(decoded), decoded.channelId);

    await db
  .update(uploads)
  .set({
    subscription_status: true,
    customer_ids: sql`array_remove(
      coalesce(${uploads.customer_ids}, '{}'::int[]), 
      ${parseInt(req.body.customer_id)}::int
    )`
  })
  .where(
    and(
      eq(uploads.admin_id, decoded.channelId),
      eq(uploads.id, req.body.id)
    )
  );


    return res.status(201).json({ message: 'Upload successful.' });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
};

export async function newUpdatePassword(req, res) {
  try {
    // Get JWT from Authorization header
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "." });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const userId = decoded.id;

    // Get the user by ID
    const user = await db.select()
      .from(channels)
      .where(eq(channels.id, userId));

    if (!user.length) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const {  currentPassword, newPassword, confirmPassword } = await req.json(); // or req.body depending on framework

    const newHashed = crypto.createHash('sha256')
      .update(newPassword)
      .digest('hex');

    await db.update(channels)
      .set({ password: newHashed })
      .where(eq(channels.id, userId));

    return res.status(200).json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("JWT Error:", error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: "Invalid token format", 
        details: error.message 
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}





// Get All the Channels 
export async function getAllChannels(req, res) {
  try {
    const allChannels = await Queries.getAllChannels();
    const channelsWithSubscribers = await Promise.all((allChannels || []).map(async (channel) => {
      const [{ subscriberCount }] = await db
        .select({ subscriberCount: sql`count(*)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.channelId, channel.id));
      return {
        ...channel,
        profile_image: channel.profile_image,
        subscriberCount: subscriberCount || 0,
      };
    }));
    res.status(200).json(channelsWithSubscribers);
  } catch (error) {
    console.error('Error in getAllChannels:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


// this is for searching 
// export async function searchChannels(req, res) {
//   console.log("searchChannels called");

//   try {
//     const { query } = req.query; // /api/search?query=music
//     console.log("Received query:", query);

//     if (!query) {
//       return res.status(400).json({ message: "Search query is required" });
//     }

//     // ✅ Call Queries and get rows only
//     const results = await Queries.searchChannels(query);
//     console.log("Results received from Queries.searchChannels:", results);

//     if (!results || results.length === 0) {
//       return res.status(404).json({ message: "No matching channels or content found" });
//     }

//     // ✅ Wrap results in { content: ... } for frontend consistency
//     res.status(200).json({ content: results });
//   } catch (error) {
//     console.error("Error in searchChannels:", error);
//     res.status(500).json({ 
//       message: "Internal server error", 
//       error: error.message 
//     });
//   }
// }

export async function searchChannels(req, res) {
  console.log("searchChannels called");
  try {
    const { query } = req.query; // /api/search?query=akanksha

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const results = await Queries.searchChannels(query);

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No matching channels found" });
    }

    const normalized = results.map((row) => ({
      ...row,
      profile_image: resolvePublicAssetUrl(req, row.profile_image),
    }));

    res.status(200).json({ content: normalized });
  } catch (error) {
    console.error("Error in searchChannels:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}






// ----------------- Get channel by ID -----------------
export const getChannelById = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Channel ID is required' });

  try {
    // Use the correct column name: 'id'
    const result = await db.select().from(channels).where(eq(channels.id, id));
    const channel = result[0]; // Drizzle returns an array

    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const [{ subscriberCount }] = await db
      .select({ subscriberCount: sql`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.channelId, id));

    res.status(200).json({
      ...channel,
      profile_image: channel.profile_image,
      subscriberCount: subscriberCount || 0,
    });
  } catch (err) {
    console.error('Error in getChannelById:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



export async function getChannelProfile(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    const [channel] = await db.select()
      .from(channels)
      .where(eq(channels.id, decoded.channelId));

    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const [{ subscriberCount }] = await db
      .select({ subscriberCount: sql`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.channelId, channel.id));
    const [{ totalViews }] = await db
      .select({ totalViews: sql`COALESCE(SUM(${uploads.views}), 0)::int` })
      .from(uploads)
      .where(eq(uploads.admin_id, channel.id));

    const { password, otp, ...safeData } = channel;
    res.status(200).json({
      user: {
        ...safeData,
        profile_image: safeData.profile_image,
        subscriberCount: subscriberCount || 0,
        totalViews: totalViews || 0,
      },
    });
    console.log('Safe data sent to frontend:', safeData);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


export async function updateChannelProfile(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'your_fallback_secret_key');
    const channelId = decoded.channelId;

    const { name, username, user_id, profile_image, phoneNumber } = req.body;

    // Only update fields that are provided
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (username !== undefined) updateFields.username = username;
    if (user_id !== undefined) updateFields.user_id = user_id;
    if (profile_image !== undefined) updateFields.profile_image = profile_image;
    if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber;

    await db.update(channels)
      .set(updateFields)
      .where(eq(channels.id, channelId));

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error('Error updating channel profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


export const getUploadById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ success: false, message: "Invalid upload ID" });
    }

    // Optional: JWT verification for security
    const token = req.header('Authorization');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Fetch the upload by ID and admin_id (security)
    const upload = await db.select().from(uploads)
      .where(
        and(
          eq(uploads.id, Number(id)),
          eq(uploads.admin_id, decoded.channelId)
        )
      );

    if (!upload.length) {
      return res.status(404).json({ success: false, message: "Upload not found" });
    }

    // thumbnail is now stored as base64 text, just add data URL prefix
    const result = {
      ...upload[0],
      thumbnail: upload[0].thumbnail
        ? (upload[0].thumbnail.startsWith('data:') ? upload[0].thumbnail : `data:image/jpeg;base64,${upload[0].thumbnail}`)
        : null,
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching upload by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const handleUpdateUpload = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid upload ID" 
      });
    }
    const token = req.header('Authorization');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Only update fields supplied by the edit form. The previous mapping used
    // `description` for title, input_link, and tags, corrupting the record.
    const updateFields = {};
    if (typeof req.body.title === 'string') updateFields.title = req.body.title.trim();
    if (typeof req.body.language === 'string') updateFields.language = req.body.language.trim();
    if (typeof req.body.input_link === 'string') updateFields.input_link = req.body.input_link.trim();
    if (typeof req.body.description === 'string') updateFields.description = req.body.description.trim();
    if (typeof req.body.tags === 'string') updateFields.tags = req.body.tags.trim();
    if (req.file?.buffer) updateFields.thumbnail = req.file.buffer.toString('base64');

    if (!Object.keys(updateFields).length) {
      return res.status(400).json({ success: false, message: 'No changes were provided.' });
    }

    // Perform update
    await db.update(uploads)
      .set(updateFields)
      .where(
        and(
          eq(uploads.id, id),
          eq(uploads.admin_id, decoded.channelId)
        )
      );

    res.status(200).json({ success: true, message: "Upload updated" });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};









// THe following is the code for Video Steaming
const client = new WebTorrent();
const activeTorrents = new Map();
const STREAMABLE_EXTENSIONS = new Set([
  'mp4', 'm4v', 'mkv', 'webm', 'mov', 'avi', 'ts', 'm2ts', 'mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac',
]);

const requestBaseUrl = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return `${forwardedProto || req.protocol}://${req.get('host')}`;
};

const isStreamableFile = (file) => STREAMABLE_EXTENSIONS.has(
  path.extname(file.name).slice(1).toLowerCase(),
);

const contentTypeFor = (fileName) => {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  return {
    mp4: 'video/mp4', m4v: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm',
    mov: 'video/quicktime', avi: 'video/x-msvideo', ts: 'video/mp2t', m2ts: 'video/mp2t',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg',
    opus: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac',
  }[extension] || 'application/octet-stream';
};

// Torrent streaming handler
export const handleTorrentStream = async (req, res) => {
  let link = req.body.link || req.query.link;
  const providedShort = req.body.shortUrl || req.query.shortUrl || req.body.shortCode || req.query.shortCode;

  try {
    if ((!link || !link.startsWith('magnet:')) && (providedShort || link)) {
      const resolved = await resolveShortLinkToOriginal(providedShort || link);
      if (resolved) {
        link = resolved;
      }
    }

    if (!link || !link.startsWith('magnet:')) {
      return res.status(400).json({ error: 'A valid magnet link or short URL is required' });
    }

    let torrent = activeTorrents.get(link);
    if (!torrent) {
      const announce = [
        // --- Robust public tracker list ---
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://tracker.openbittorrent.com:6969/announce',
        'udp://tracker.internetwarriors.net:1337/announce',
        'udp://tracker.leechers-paradise.org:6969/announce',
        'udp://exodus.desync.com:6969/announce',
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.torrent.eu.org:451/announce',
        'udp://open.stealth.si:80/announce',
        'udp://open.tracker.cl:1337/announce',
        'udp://tracker.moeking.me:6969/announce',
        'udp://tracker.dler.com:6969/announce',
        'udp://tracker1.bt.moack.co.kr:80/announce',
        'udp://tracker.cyberia.is:6969/announce',
      ];

      torrent = client.add(link, { announce });
      activeTorrents.set(link, torrent);

      torrent.on('ready', () => {
        console.log(`Torrent ready: ${torrent.name}`);
        console.log(`Torrent info hash: ${torrent.infoHash}`);
        console.log(`Torrent files:`, torrent.files.map(f => f.name));
      });

      torrent.on('download', () => {
        const progress = Math.round(torrent.progress * 100);
        console.log(`Torrent download progress: ${progress}%`);
      });

      torrent.on('wire', (wire) => {
        console.log('Peer connected');
      });

      torrent.on('done', () => console.log(`Torrent download finished: ${torrent.name}`));
      torrent.on('error', (err) => {
        console.error('Torrent error:', err.message);
        activeTorrents.delete(link);
      });
    }

    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log(`Torrent timeout for link: ${link}`);
        torrent.destroy();
        activeTorrents.delete(link);
        res.status(500).json({ error: 'Torrent loading timed out. The torrent may be slow or there may be no available peers. Please try again.' });
      }
    }, 180000); // Increased to 3 minutes

    const processTorrent = () => {
      const playableFiles = torrent.files.filter(isStreamableFile);
      const selectedFile = (playableFiles.length ? playableFiles : torrent.files)
        .reduce((largest, file) => (!largest || file.length > largest.length ? file : largest), null);
      if (!selectedFile) {
        clearTimeout(timeout);
        return res.status(422).json({ error: 'The torrent contains no streamable files.' });
      }

      // WebTorrent selects every file by default. Selecting only the requested
      // video prevents subtitles, samples, and alternate releases from taking
      // bandwidth away from the opening playback pieces.
      torrent.files.forEach((file) => file.deselect());
      selectedFile.select(10);

      const fileIndex = torrent.files.indexOf(selectedFile);
      const baseUrl = requestBaseUrl(req);
      const streamLinks = [{
        fileName: selectedFile.name,
        streamUrl: `${baseUrl}/stream/torrent/${encodeURIComponent(torrent.infoHash)}/${fileIndex}`,
      }];
      clearTimeout(timeout);
      res.json({ streamLinks });
    };

    if (!torrent.ready) {
      torrent.once('ready', processTorrent);
      torrent.once('error', (err) => {
        console.error('Torrent error:', err.message);
        clearTimeout(timeout);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to process the torrent.' });
      });
    } else {
      processTorrent();
    }
  } catch (error) {
    console.error('Error processing torrent:', error.message);
    res.status(500).json({ error: 'Failed to process the torrent' });
  }
};

// Streaming a specific torrent file
export const streamTorrentFile1 = (req, res) => {
  const { filename } = req.params;
  const torrent = client.torrents.find(t => t.files.some(f => f.name === filename));
  if (!torrent) return res.status(404).send('File not found.');

  const file = torrent.files.find(f => f.name === filename);
  const range = req.headers.range;
  const fileSize = file.length;

  if (!range) {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    return file.createReadStream().pipe(res);
  }

  const positions = range.replace(/bytes=/, '').split('-');
  const start = parseInt(positions[0], 10);
  const end = positions[1] ? parseInt(positions[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/mp4'
  });

  file.createReadStream({ start, end }).pipe(res);
};




// Streaming a specific torrent file
// Streaming a specific torrent file
export const streamTorrentFile = (req, res) => {
  const { infoHash, fileIndex, filename } = req.params;
  const decodedName = filename ? decodeURIComponent(filename) : '';
  const torrent = infoHash
    ? client.torrents.find((item) => item.infoHash === infoHash)
    : client.torrents.find((item) => item.files.some((file) => path.basename(file.name) === decodedName));

  if (!torrent) return res.status(404).send('Torrent not found.');

  const index = Number.parseInt(fileIndex, 10);
  const file = Number.isInteger(index)
    ? torrent.files[index]
    : torrent.files.find((item) => path.basename(item.name) === decodedName);

  if (!file) return res.status(404).send('File not found in torrent.');

  const range = req.headers.range;
  const fileSize = file.length;
  const MAX_STREAM_CHUNK_BYTES = 4 * 1024 * 1024;
  let stream;

  file.select(10);

  if (!range) {
    res.writeHead(200, {
      'Content-Type': contentTypeFor(file.name),
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
    });
    stream = file.createReadStream();
  } else {
    const positions = range.replace(/^bytes=/, '').split('-', 2);
    const start = Number.parseInt(positions[0], 10);
    if (!Number.isInteger(start) || start < 0 || start >= fileSize) {
      return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }
    const requestedEnd = positions[1] ? Number.parseInt(positions[1], 10) : fileSize - 1;
    const end = Math.min(
      Number.isInteger(requestedEnd) ? requestedEnd : fileSize - 1,
      start + MAX_STREAM_CHUNK_BYTES - 1,
      fileSize - 1,
    );
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentTypeFor(file.name),
    });

    stream = file.createReadStream({ start, end });
  }

  stream.on('error', (err) => {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Stream error');
    } else {
      res.destroy();
    }
  });

  res.on('close', () => {
    console.log('Client disconnected, destroying stream');
    stream.destroy();
  });

  stream.pipe(res);
};

// Transcode an unsupported torrent codec (for example HEVC/H.265) into the
// broadly supported H.264/AAC combination. This is requested only after the
// device decoder has rejected the original direct stream.
export const transcodeTorrentFile = (req, res) => {
  try {
    const { infoHash, fileIndex } = req.params;
    const torrent = client.torrents.find((item) => item.infoHash === infoHash);
    const index = Number.parseInt(fileIndex, 10);
    const file = torrent && Number.isInteger(index) ? torrent.files[index] : null;
    const ffmpegBinary = getFfmpegBinary();

    if (!torrent || !file) return res.status(404).json({ error: 'Torrent file not found.' });
    if (!ffmpegBinary) {
      return res.status(503).json({
        error: 'This video needs transcoding, but FFmpeg is unavailable on the server.',
      });
    }

    file.select(10);
    const source = file.createReadStream();
    const transcoder = spawn(ffmpegBinary, [
      '-hide_banner', '-nostdin', '-loglevel', 'warning',
      // Torrent files are commonly Matroska/HEVC and may not include useful
      // timestamps at the start of the stream. Generate them so fragmented
      // MP4 playback can begin as soon as FFmpeg receives enough pieces.
      '-fflags', '+genpts', '-probesize', '10M', '-analyzeduration', '10M',
      '-i', 'pipe:0',
      '-map', '0:v:0?', '-map', '0:a:0?',
      // H.264 8-bit 4:2:0 with AAC plays on Android hardware decoders that
      // reject 10-bit HEVC (including many MediaTek devices).
      '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'baseline', '-level', '3.1', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-max_muxing_queue_size', '1024',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      '-f', 'mp4', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    let responseStarted = false;
    const fail = (status, error) => {
      console.error('Torrent transcoding failed:', { infoHash, fileIndex, error });
      if (!responseStarted && !res.headersSent) return res.status(status).json({ error });
      res.destroy();
    };
    const beginResponse = () => {
      if (responseStarted) return;
      responseStarted = true;
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        'Transfer-Encoding': 'chunked',
      });
    };

    transcoder.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-2000);
    });
    transcoder.once('error', (error) => fail(500, `Unable to start FFmpeg: ${error.message}`));
    transcoder.once('exit', (code, signal) => {
      if (code && code !== 0) fail(422, stderr.trim() || `FFmpeg exited with code ${code}.`);
      if (signal && !responseStarted) fail(422, stderr.trim() || `FFmpeg was stopped by ${signal}.`);
    });
    transcoder.stdout.once('data', (chunk) => {
      beginResponse();
      res.write(chunk);
      transcoder.stdout.pipe(res);
    });

    source.on('error', (error) => fail(500, `Torrent read failed: ${error.message}`));
    transcoder.stdin.on('error', (error) => {
      // FFmpeg closes stdin after a decoding failure; its exit handler returns
      // the useful stderr message to the client before output starts.
      if (error.code !== 'EPIPE') fail(500, `FFmpeg input failed: ${error.message}`);
    });
    source.pipe(transcoder.stdin);
    res.on('close', () => {
      source.destroy();
      transcoder.kill('SIGTERM');
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown torrent transcoding error.';
    console.error('Torrent transcode setup failed:', message);
    if (!res.headersSent) return res.status(500).json({ error: message });
    res.destroy();
  }
};


// Google Drive
export const handleGoogleDrive = async (req, res) => {
  const link = req.body.link || req.query.link;
  const fileId = extractDriveFileId(link);
  if (!fileId) return res.status(400).json({ error: 'Invalid Google Drive link' });

  const directUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
  const response = await axios({ url: directUrl, method: 'GET', responseType: 'stream' });
  res.setHeader('Content-Type', response.headers['content-type']);
  res.setHeader('Content-Disposition', 'inline');
  response.data.pipe(res);
};

// Dropbox
export const handleDropbox = async (req, res) => {
  const link = req.body.link || req.query.link;
  const directUrl = link.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '?dl=1');
  const response = await axios({ url: directUrl, method: 'GET', responseType: 'stream' });
  res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  response.data.pipe(res);
};

// pCloud
export const handlePCloud = async (req, res) => {
  const link = req.body.link || req.query.link;
  const urlObj = new URL(link);
  const code = urlObj.searchParams.get('code');
  if (!code) return res.status(400).json({ error: 'Invalid pCloud link, missing code parameter' });

  const apiResponse = await axios.get(`https://api.pcloud.com/getpublinkdownload?code=${code}`);
  if (apiResponse.data.result !== 0) return res.status(400).json({ error: 'Invalid pCloud link' });

  const directUrl = `https://${apiResponse.data.hosts[0]}${apiResponse.data.path}`;
  const response = await axios({ url: directUrl, method: 'GET', responseType: 'stream' });
  res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  response.data.pipe(res);
};

// Icedrive
export const handleIcedrive = async (req, res) => {
  let link = req.body.link || req.query.link;
  const directUrl = link.includes('?dl=') ? link : `${link}?dl=1`;
  const response = await axios({ url: directUrl, method: 'GET', responseType: 'stream' });
  res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  response.data.pipe(res);
};

// MEGA
export const handleMega = (req, res) => {
  const link = req.body.link || req.query.link;
  const file = File.fromURL(link);

  file.on('error', (err) => {
    console.error('MEGA error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream from MEGA' });
  });

  file.on('ready', () => {
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    file.pipe(res);
  });
};


// helpers/linkHelpers.js
export function extractDriveFileId(link) {
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
