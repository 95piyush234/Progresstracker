import cron from 'node-cron';
import webpush from 'web-push';
import { User } from '../models/User.js';
import { ProgressEntry } from '../models/ProgressEntry.js';

cron.schedule('0 21 * * *', async () => {
  try {
    const users = await User.find({ pushSubscription: { $ne: null } });
    
    // Create a timestamp for the very start of today (midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const user of users) {
      // Check if they logged any TRACKER PROGRESS today
      const logsToday = await ProgressEntry.countDocuments({ 
        user: user._id, // or userId, depending on your database schema
        createdAt: { $gte: todayStart } 
      });

      // If no tracker progress was logged, send the push
      if (logsToday === 0) {
        const payload = JSON.stringify({
          title: "Don't break your streak! 🔥",
          body: "Hey, where are you? You haven't logged any tracker progress today.",
          url: "/"
        });

        await webpush.sendNotification(user.pushSubscription, payload).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
             User.updateOne({ _id: user._id }, { $set: { pushSubscription: null } }).exec();
          }
        });
      }
    }
  } catch (error) {
    console.error("Cron Job Error:", error);
  }
}, {
  timezone: "Asia/Kolkata" 
});