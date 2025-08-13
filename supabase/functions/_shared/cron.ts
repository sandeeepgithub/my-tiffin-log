// Cron job configuration for Supabase Edge Functions
// This file defines the schedule for various automated tasks

export const cronJobs = [
  {
    name: 'send-tiffin-reminders',
    schedule: '0 */1 * * *', // Run every hour
    function: 'send-tiffin-reminders',
    description: 'Send push notifications to users who need tiffin reminders'
  }
]

// To set up cron jobs in Supabase:
// 1. Deploy the edge function: supabase functions deploy send-tiffin-reminders
// 2. Create a cron job using pg_cron extension in your database:
//    SELECT cron.schedule('send-tiffin-reminders', '0 */1 * * *', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/send-tiffin-reminders'', headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb) as request_id;');

// Alternative: Use external cron services like:
// - GitHub Actions with scheduled workflows
// - Vercel Cron Jobs
// - Upstash QStash
// - Traditional cron on a server

export default cronJobs
