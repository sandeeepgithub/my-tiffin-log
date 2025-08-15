import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current time and date
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log(`Checking for notifications at ${currentTime}`);

    // Get all users who need notifications at this time
    const { data: users, error: usersError } = await supabaseClient.rpc(
      "get_users_for_notifications",
      {
        target_time: currentTime,
        target_timezone: "UTC", // You can enhance this to support different timezones
      }
    );

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users to notify`);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users to notify at this time",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let notificationsSent = 0;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      "mailto:your-email@example.com", // Replace with your email
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send notifications to users who haven't logged entries today
    for (const user of users) {
      // Skip users who already have entries for today
      if (user.has_entry_today) {
        console.log(
          `Skipping user ${user.user_id} - already has entry for today`
        );
        continue;
      }

      try {
        // Send push notification
        const pushSubscription = user.push_subscription as PushSubscription;

        if (!pushSubscription || !pushSubscription.endpoint) {
          console.log(
            `Skipping user ${user.user_id} - no valid push subscription`
          );
          continue;
        }

        const notificationPayload = {
          title: "🍱 Tiffin Tracker Reminder",
          body: "Don't forget to log your tiffins for today!",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          data: {
            url: "/",
            timestamp: Date.now(),
          },
        };

        // Send the actual push notification
        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload)
          );

          console.log(
            `✅ Notification sent successfully to user ${user.user_id}`
          );

          // Update last notification sent date only after successful send
          const { error: updateError } = await supabaseClient
            .from("notification_preferences")
            .update({ last_notification_sent: currentDate })
            .eq("user_id", user.user_id);

          if (updateError) {
            console.error(
              `Error updating notification date for user ${user.user_id}:`,
              updateError
            );
          } else {
            notificationsSent++;
          }
        } catch (pushError: any) {
          console.error(
            `Failed to send push notification to user ${user.user_id}:`,
            pushError
          );

          // If the subscription is invalid, we might want to remove it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(
              `Removing invalid subscription for user ${user.user_id}`
            );
            await supabaseClient
              .from("notification_preferences")
              .update({ push_subscription: null })
              .eq("user_id", user.user_id);
          }
        }
      } catch (error) {
        console.error(
          `Error processing notification for user ${user.user_id}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent successfully`,
        notificationsSent,
        usersChecked: users.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-tiffin-reminders function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
