import cron from 'node-cron';
import webpush from 'web-push';
import { User } from '../models/User.js';
import DiaryEntry from '../models/diary.model.js'; // Assuming you check goals or diary

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Runs every day at 8:00 PM (20:00)
cron.schedule('0 20 * * *', async () => {
  try {
    // 1. Find all users who allowed push notifications
    const users = await User.find({ pushSubscription: { $ne: null } });
    
    const today = new Date().toLocaleDateString();

    for (const user of users) {
      // 2. Check if they logged anything today
      const logsToday = await DiaryEntry.countDocuments({ 
        user: user._id, 
        dateStr: today 
      });

      // 3. If no logs today, shoot the notification!
      if (logsToday === 0) {
        const payload = JSON.stringify({
          title: "You're missing out! 🫣",
          body: "Hey, where are you? You haven't logged any progress today. Keep your momentum going!",
          url: "/"
        });

        await webpush.sendNotification(user.pushSubscription, payload).catch(err => {
          // If the subscription expired, remove it from the DB
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