import cron from 'node-cron';
import webpush from 'web-push';
import { User } from '../models/User.js';
import { ProgressEntry } from '../models/ProgressEntry.js';

// 45 16 is 16:45 UTC, which is exactly 10:15 PM IST.
cron.schedule('45 16 * * *', async () => {
  console.log("CRON TRIGGERED: Running daily tracker check!"); 
  try {
    const users = await User.find({ pushSubscription: { $ne: null } });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const user of users) {
      const logsToday = await ProgressEntry.countDocuments({ 
        user: user._id, 
        entryDate: { $gte: todayStart } 
      });

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
}); 
// DELETED the { timezone: "Asia/Kolkata" } block entirely.
