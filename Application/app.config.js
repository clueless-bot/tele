require('dotenv').config();

export default ({ config }) => ({
  ...config,
  projectId: config.projectId || (config.extra && config.extra.eas && config.extra.eas.projectId),
  extra: {
    ...config.extra, // preserve other extra fields
    BASE_URL: process.env.BASE_URL || (config.extra && config.extra.BASE_URL),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || (config.extra && config.extra.GOOGLE_CLIENT_ID),
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID || (config.extra && config.extra.GOOGLE_ANDROID_CLIENT_ID),
    GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID || (config.extra && config.extra.GOOGLE_IOS_CLIENT_ID),
    GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID || (config.extra && config.extra.GOOGLE_WEB_CLIENT_ID),
    GOOGLE_EXPO_CLIENT_ID: process.env.GOOGLE_EXPO_CLIENT_ID || (config.extra && config.extra.GOOGLE_EXPO_CLIENT_ID),
  },
});
