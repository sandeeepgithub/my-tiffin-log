# 🚀 Tiffin Log - Setup Credentials

## Environment Variables for Vercel & Local Development

Copy these credentials to your `.env.local` file for local development and to **Vercel Settings → Environment Variables** for production.

### Supabase Configuration

```
VITE_SUPABASE_URL=https://lhscrwzcmncfctbuoawu.supabase.co
VITE_SUPABASE_ANON_KEY=<get-from-supabase-project-settings>
SUPABASE_SECRET_KEY=<get-from-supabase-project-settings>
```

### Push Notifications (Web Push)

```
VITE_VAPID_PUBLIC_KEY=<generate-from-web-push-codelab>
VAPID_PRIVATE_KEY=<generate-from-web-push-codelab>
```

---

## 🔐 How to Get Your Credentials

### Supabase Keys
1. Go to https://supabase.com/dashboard/project/lhscrwzcmncfctbuoawu
2. Click **Settings** → **API**
3. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SECRET_KEY`

### VAPID Keys (Push Notifications)
1. Go to https://web-push-codelab.glitch.me/
2. Generate new VAPID keys
3. Copy both keys to your `.env.local`

## 🔐 Security Notes

⚠️ **NEVER** commit these credentials to version control!

- `.env.local` is in `.gitignore` - use it for local development only
- Add credentials to **Vercel → Settings → Environment Variables** for production
- All three environments (Production, Preview, Development) should have these variables
- Keep `SUPABASE_SECRET_KEY` and `VAPID_PRIVATE_KEY` secure

## 📝 Setup Checklist

- [ ] Create `.env.local` file and add above credentials
- [ ] Add credentials to Vercel Environment Variables
- [ ] Run migrations in Supabase SQL Editor (create tables)
- [ ] Test locally: `npm run dev`
- [ ] Deploy to Vercel

## 🗄️ Database Setup

Run the following SQL in your Supabase SQL Editor to create tables:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Run the migration SQL (check supabase/migrations/ folder in source code)
4. Tables created:
   - `notification_preferences`
   - `profiles`
   - `tiffin_entries`

## ✨ Features

- 🍱 Track tiffin (meal) entries with afternoon/evening counts
- 🔔 Push notifications for daily reminders
- 👤 User authentication via Supabase
- 📊 History and statistics
- 🌐 Progressive Web App (PWA)

**Deployment ready!** 🚀
