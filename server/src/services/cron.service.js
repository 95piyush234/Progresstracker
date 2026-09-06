import cron from 'node-cron';
import webpush from 'web-push';
import { User } from '../models/User.js';
import { ProgressEntry } from '../models/ProgressEntry.js';

// Scheduled for 16:55 UTC (10:25 PM IST)
cron.schedule('55 16 * * *', async () => {
  console.log("CRON TRIGGERED: Starting 10:25 PM check!"); 
  try {
    const users = await User.find({ pushSubscription: { $ne: null } });
    console.log(`STATUS: Found ${users.length} users with push subscriptions.`);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const user of users) {
      const logsToday = await ProgressEntry.countDocuments({ 
        user: user._id, 
        entryDate: { $gte: todayStart } 
      });
      console.log(`STATUS: User ${user._id} has ${logsToday} logs today.`);

      if (logsToday === 0) {
        const payload = JSON.stringify({
          title: "Don't break your streak! 🔥",
          body: "Hey, where are you? You haven't logged any tracker progress today.",
          url: "/"
        });

        console.log("STATUS: Attempting to send webpush notification...");
        await webpush.sendNotification(user.pushSubscription, payload).then(() => {
            console.log("SUCCESS: Notification sent to phone!");
        }).catch(err => {
          console.error("WEBPUSH FATAL ERROR:", err); // This will reveal the missing keys
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
