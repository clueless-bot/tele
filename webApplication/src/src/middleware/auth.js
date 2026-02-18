import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import process from 'process';
import path from 'path';

dotenv.config({
  path: path.join(process.cwd(), '.env')
});

const jwtSecret = process.env.JWT_SECRET_KEY || '';
if (!jwtSecret) {
  throw new Error('Unable to retrieve JWT Secret Key from env');
}

export default async function authorization(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader && authHeader.split(' ')[1] || '';

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.error(err);
        return res.status(403).json({ error: 'Failed to authenticate token.' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).send('Authorization Token is Missing');
  }
}

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token and extract user data
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // This should contain channelId of the logged-in admin
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

// Function to extract and decode token
export function extractToken(token, jwtSecret) {
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret);
    console.log(object(decoded.id));
    return decoded.id; // Assuming the user ID is stored in 'id'
    
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}


