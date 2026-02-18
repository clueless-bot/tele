// import db from './config.js';
import { desc, eq, like, sql, ilike, or, isNotNull, and } from 'drizzle-orm';
import { users, shortLinks, channels, subscriptions, uploads } from './schema.js';

import { getDbInstance } from './config.js';



const db = getDbInstance();

console.log("dbdbdbdbdbdb", db);

export default class Queries {

  // Check if email already exists
  static async doesEmailAlreadyExists(email) {
    const existingEmail = await db
      .select().from(channels)
      .where(eq(channels.email, email));

    return existingEmail;
  }

  // Is user already subscribed 
  static async isUserSubscribed(userId, channelId) {
    try {
      // Convert to integers to ensure proper type matching
      const userIdInt = parseInt(userId, 10);
      const channelIdInt = parseInt(channelId, 10);
      
      if (isNaN(userIdInt) || isNaN(channelIdInt)) {
        console.error('Invalid userId or channelId:', { userId, channelId });
        return [];
      }

      const existingSubscription = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userIdInt),
            eq(subscriptions.channelId, channelIdInt)
          )
        );

      return existingSubscription;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return [];
    }
  }

  // Find user by email
  static async findUserWithEmail(email) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      return user[0];
    } catch (error) {
      console.error('Error finding user with email:', error);
      return null;
    }
  }

  // get all users 
  static async getAllUsers() {
    try {
      const res = await db.select().from(users)
      return res;
    } catch (e) {
      console.log(e)
      return null
    }
  }

  // Add new user
  static async addNewUserToDB(email, name, password, phoneNumber, otp) {
    const res = await db
      .insert(users)
      .values({ email, name, password, phoneNumber, otp })
      .returning({ id: users.id, email: users.email, name: users.name , otp: users.otp});
  
    return res[0];
  }

  // Create new channel
  static async createNewChannel(name, email, phoneNumber, password, otp, username) {
    const res = await db
      .insert(channels)
      .values({ name, email, phoneNumber, password, otp, username })
      .returning({ id: channels.id, name: channels.name, email: channels.email, phoneNumber: channels.phoneNumber, username: channels.username })

    return res[0];
  }

  static async updateUserOTP(email, otp) {
    const res = await db
      .update(channels)
      .set({ otp: otp })  // Update only the OTP field
      .where(eq(channels.email, email))  // Target user by email
      .returning({ 
        id: channels.id,
        email: channels.email,
        name: channels.name,
        otp: channels.otp  // Return updated OTP for verification
      });
  
    return res[0];
  }

  static async updatePassword(email, password) {
    const res = await db
      .update(channels)
      .set({ password: password })  // Update only the OTP field
      .where(eq(channels.email, email))  // Target user by email
      .returning({ 
        id: channels.id,
        email: channels.email,
        name: channels.name,
        otp: channels.otp
      });
  
    return res[0];
  }


  static async fetchUserOTP(email) {
    const res = await db
      .select({
        otp: channels.otp, // Fetch only the OTP field
      })
      .from(channels)
      .where(eq(channels.email, email)); // Target user by email
  
    return res[0]; // Return the OTP object
  }
  
  

  // Check if email already exists
  static async doesChannelAlreadyExists(email) {
    const existingEmail = await db
      .select().from(channels)
      .where(eq(channels.email, email));

    return existingEmail;
  }

  static async getAllChannels() {
    try {
      const res = await db.select().from(channels);
      return res;
    } catch (e) {
      console.error('Error fetching all channels:', e);
      return null;
    }
  }

  // Save magnet
  static async saveMagnet(uid, magnet, channel, filename, title, language) {
    try {
      const res = await db
        .insert(shortLinks)
        .values({ uid, magnet, channel, fileUrl: filename, title, language })

      return res;

    } catch (error) {
      console.error('Error saving magnet:', error);
      return null;
    }
  }

  // Retrieve magnet using name 
  static async searchContent(query) {
    try {
      const res = await db
        .select()
        .from(shortLinks)
        .where(like(shortLinks.title, `%${query}%`))
      return res;
    } catch (e) {
      console.log("error retrieving content", e)
      return null;
    }
  }

  // Retrieve magnet using short link
  static async retrieveMagnetUsingShortLink(uid) {
    try {
      const shortLink = await db
        .select()
        .from(shortLinks)
        .where(eq(shortLinks.uid, uid))

      console.log("shortlink", shortLink)

      if (!shortLink.length) return '';

      if (shortLink[0].clicks >= 0) {
        await db
          .update(shortLinks)
          .set({ clicks: shortLink[0].clicks + 1 })
          .where(eq(shortLinks.uid, uid));
      }

      return shortLink[0].magnet;
    } catch (error) {
      console.error('Error retrieving magnet:', error);
      return '';
    }
  }

  // Retrieve short link stats
  static async retrieveShortStats(uid) {
    try {
      const res = await db
        .select()
        .from(shortLinks)
        .where(eq(shortLinks.uid, uid))

      return res || 0; // Handle case where record doesn't exist
    } catch (error) {
      console.error('Error retrieving short stats:', error);
      return 0;
    }
  }

  // Retrieve channel content
  static async retrieveChannelContent1(id) {
    try {
      // const res = await db
      //   .select()
      //   .from(shortLinks)
      //   .where(eq(shortLinks.channel, id))

      // return res || 0;

      const res = await db
      .select()
      .from(uploads) // changed from shortLinks to uploads
      .where(eq(uploads.admin_id, id)); // match admin_id instead of channel

    return res || []; // return empty array instead of 0 if no data

    } catch (e) {
      console.log("Error retrieving channel content:", e)
      return 0;
    }
  }

  static async retrieveChannelContent(id) {
    try {
      const res = await db
        .select({
          id: uploads.id,     
          thumbnail: uploads.thumbnail,
          title: uploads.title,
          language: uploads.language,
          description: uploads.description,
          tags: uploads.tags,
          input_link: uploads.input_link,
        })
        .from(uploads)
        .where(eq(uploads.admin_id, id)); // id must be a number
  
      const formattedRes = res.map(item => ({
        ...item,
        // thumbnail is now already stored as base64 text, just add data URL prefix if needed
        thumbnail: item.thumbnail ? (item.thumbnail.startsWith('data:') ? item.thumbnail : `data:image/jpeg;base64,${item.thumbnail}`) : null,
      }));
  
      return formattedRes;
    } catch (e) {
      console.log("Error retrieving channel content:", e);
      return [];
    }
  }
  

  // Retrieve latest content
  static async retrieveLatestContent(id) {
    try {
      const latestContent = await db
        .select()
        .from(shortLinks)
        .where(eq(shortLinks.channel, id))
        .orderBy(desc(shortLinks.createdAt)) // Order by createdAt in descending order
        .limit(3);

      return latestContent;
    } catch (e) {
      console.log("Error retrieving channel content:", e)
      return 0;
    }
  }

  // delete channel content
  static async deleteChannelContent(uid) {
    try {
      const res = await db
        .delete(shortLinks)
        .where(eq(shortLinks.uid, uid))
        .returning()

      return res;

    } catch (e) {
      console.log("Error deleting the content", e);
      return 0;
    }
  }

  // subscribe to channel 
  static async susbcribeChannel(userId, channelId) {
    try {
      // Ensure integers
      const userIdInt = parseInt(userId, 10);
      const channelIdInt = parseInt(channelId, 10);
      
      if (isNaN(userIdInt) || isNaN(channelIdInt) || userIdInt <= 0 || channelIdInt <= 0) {
        console.error('Invalid userId or channelId for subscription:', { userId, channelId });
        return null;
      }

      const res = await db
        .insert(subscriptions)
        .values({ userId: userIdInt, channelId: channelIdInt })
        .returning({ 
          id: subscriptions.id, 
          userId: subscriptions.userId, 
          channelId: subscriptions.channelId, 
          createdAt: subscriptions.createdAt 
        });

      console.log('Subscription created successfully:', res[0]);
      return res[0];
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      // Check if it's a duplicate key error (unique constraint violation)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        console.log('Duplicate subscription detected');
        return null; // Return null to indicate duplicate
      }
      throw error; // Re-throw other errors
    }
  }


  // unsubscribe the channel
  static async unsubscribeChannel(id) {
    try {
      const res = await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, id))
        .returning()

      return res;

    } catch (e) {
      console.log("Error unsubscribing the channel", e);
      return 0;
    }
  }






// Queries.js
// static async searchChannels(query) {
//   const [rows] = await db.query(
//     `SELECT 
//         c.channel_id, 
//         c.channel_name, 
//         u.upload_id,
//         u.title, 
//         u.description, 
//         u.tags
//      FROM channels c
//      LEFT JOIN uploads u ON c.channel_id = u.admin_id
//      WHERE c.channel_name LIKE ? 
//         OR u.title LIKE ? 
//         OR u.description LIKE ? 
//         OR u.tags LIKE ?`,
//     [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
//   );

//   return rows; // ✅ return only matching rows
// }




// Queries.js
// this is for search channels and uploads
	static async searchChannels(query) {
	  try {
	    const searchTerm = `%${query.trim()}%`;

	    // Fetch channels joined with uploads
	    const rows = await db
	      .select({
	        channel_id: channels.id,
	        channel_name: channels.name,
	        username: channels.username,
	        profile_image: channels.profile_image,
	        upload_id: uploads.id,
	        title: uploads.title,
	        description: uploads.description,
	        input_link: uploads.input_link,
	        // thumbnail: uploads.thumbnail,
	        tags: uploads.tags,
	      })
      .from(channels)
      .leftJoin(uploads, eq(uploads.admin_id, channels.id))
      .where(
        or(
          ilike(channels.name, searchTerm),
          ilike(channels.username, searchTerm),
          ilike(uploads.title, searchTerm),
          ilike(uploads.description, searchTerm),
          ilike(uploads.tags, searchTerm)
        )
      )
      .groupBy(channels.id, uploads.id);

    // Add source in JS
    const results = rows.map(row => {
      const isChannelMatch =
        row.channel_name.toLowerCase().includes(query.toLowerCase()) ||
        (row.username || '').toLowerCase().includes(query.toLowerCase());
      return {
        ...row,
        source: isChannelMatch ? 'channel' : 'upload',
      };
    });

    console.log("Search results:", results);
    return results;
  } catch (e) {
    console.error("Error searching channels and uploads:", e);
    return [];
  }
}


// Queries.js
// Get user subscriptions
static async getUserSubscriptions(userId) {
  try {
    const userIdInt = parseInt(userId, 10);
    
    if (isNaN(userIdInt) || userIdInt <= 0) {
      console.error('Invalid userId for getUserSubscriptions:', userId);
      return [];
    }

    const userSubscriptionsRaw = await db
      .select({
        subscriptionId: subscriptions.id,
        userId: subscriptions.userId,
        channelId: subscriptions.channelId,
        createdAt: subscriptions.createdAt,
        name: channels.name,
        username: channels.username,
        profile_image: channels.profile_image,
      })
      .from(subscriptions)
      .innerJoin(channels, eq(subscriptions.channelId, channels.id))
      .where(eq(subscriptions.userId, userIdInt));

    // Map profile_image to avatar for mobile app compatibility
    const userSubscriptions = userSubscriptionsRaw.map(sub => ({
      ...sub,
      avatar: sub.profile_image || null,
    }));

    console.log(`Retrieved ${userSubscriptions.length} subscriptions for user ${userIdInt}`);
    return userSubscriptions;
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return [];
  }
}

}
