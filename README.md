# 🎓 University Dashboard

A fully functional university dashboard for students and Class Representatives (CR) with **permanent cloud storage** via Supabase. Deploy to Cloudflare Pages or Vercel in minutes!

## ✨ Features

### Student Dashboard
- 📢 **Announcements** — Real-time updates from CR with priority indicators
- 📝 **Assignments** — Track pending and completed assignments with deadlines
- ⏰ **Deadlines** — Visual timeline of upcoming deadlines with priority levels
- ❓ **Quizzes** — Schedule of upcoming quizzes with duration and marks
- 📊 **Quick Stats** — At-a-glance overview of all activities
- 🌙 **Dark Mode** — Toggle between light and dark themes

### Admin Panel (CR Only)
- 🔐 **Password Protected** — Secure access for CR
- ➕ **Add/Edit/Delete** — Full CRUD for all content types
- 🔍 **Search & Filter** — Quickly find items in tables
- 📥 **Export Data** — Backup all data as JSON
- 📤 **Import Data** — Restore from previous backups
- 🔧 **Settings** — Change admin password

### Cloud Features
- ☁️ **Supabase Backend** — Permanent PostgreSQL database
- 🔄 **Real-time Sync** — Changes reflect instantly across all users
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🚀 **Serverless Ready** — Deploy to Cloudflare or Vercel

---

## 🚀 Quick Start

### 1. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"** and give it a name (e.g., `university-dashboard`)
3. Wait for the project to be created (takes ~2 minutes)
4. Go to **Project Settings → API** and copy:
   - `Project URL` (e.g., `https://abcdefgh12345678.supabase.co`)
   - `anon/public` API key

### 2. Create Database Tables

1. In Supabase, go to **SQL Editor → New Query**
2. Copy the contents of `schema.sql` from this project
3. Paste and click **Run**
4. Tables will be created automatically

### 3. Configure the App

Open `config.js` and replace the placeholders:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project-url.supabase.co',  // Your Project URL
    anonKey: 'your-anon-key'                       // Your anon/public key
};
```

### 4. Test Locally

Simply open `index.html` in your browser:

```bash
# Option 1: Direct open
open index.html

# Option 2: Using Python HTTP server
python -m http.server 8000
# Then visit http://localhost:8000

# Option 3: Using Node.js
npx serve .
```

---

## 📦 Deployment

### Deploy to Cloudflare Pages

1. Push your code to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
3. Click **"Create a project"** → Connect your GitHub repo
4. Build settings:
   - **Build command:** (leave empty for static site)
   - **Build output directory:** `/` (root)
5. Click **Save and Deploy**
6. Your dashboard is live! 🎉

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Framework preset: **Other** (static site)
5. Click **Deploy**
6. Your dashboard is live! 🎉

---

## 📁 File Structure

```
CustDashboard/
├── index.html          # Student dashboard
├── admin.html          # CR admin panel
├── style.css           # Global styles + responsive design
├── script.js           # Shared utilities (dark mode, toasts, helpers)
├── data.js             # Data layer - Supabase REST API + localStorage fallback
├── dashboard.js        # Student view rendering
├── admin.js            # Admin panel logic + auth
├── config.js           # Supabase configuration (edit this!)
├── schema.sql          # Database schema for Supabase
├── README.md           # This file
└── TODO.md             # Implementation tracker
```

---

## 🔑 Default Credentials

| Role | Password |
|------|----------|
| Admin (CR) | `cr2024` |

Change this in the admin panel after first login.

---

## 🛠️ How It Works

### Architecture
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Your Browser  │◄────►│  Cloudflare/    │◄────►│    Supabase     │
│  (index.html)   │      │    Vercel CDN   │      │  (PostgreSQL)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Data Flow
1. **Frontend** (HTML/CSS/JS) makes API calls to Supabase REST API
2. **Supabase** handles authentication, database queries, and real-time updates
3. **No backend server needed** — Supabase provides everything

### Fallback Mode
If Supabase is not configured, the app automatically falls back to `localStorage` so you can still use it locally.

---

## 🎨 Customization

### Change Colors
Edit CSS variables in `style.css`:

```css
:root {
    --primary: #1E3A8A;        /* Main blue */
    --primary-light: #3B82F6;  /* Light blue */
    --accent: #10B981;         /* Green */
    --accent-warning: #F59E0B; /* Orange */
    --accent-danger: #EF4444;  /* Red */
}
```

### Add Sample Data
After connecting to Supabase, use the admin panel to add your class data, or insert directly via SQL Editor.

---

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Desktop | 1024px+ | Full sidebar + 2-column grid |
| Tablet | 768-1024px | Collapsed sidebar + stacked |
| Mobile | < 768px | Hidden sidebar + single column |

---

## 🌐 Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 💾 Data Storage Options

| Mode | Storage | Persistence | Use Case |
|------|---------|-------------|----------|
| **Cloud** | Supabase PostgreSQL | Permanent | Production deployment |
| **Local** | Browser localStorage | Until cleared | Local testing/development |

---

## 🔒 Security Notes

- The Supabase `anon` key is safe to expose in frontend code (it's designed for this)
- Row Level Security (RLS) is enabled on all tables
- Admin password is stored hashed in the database
- For production, consider adding additional authentication layers

---

## 🐛 Troubleshooting

### "Connected to cloud database!" not showing
- Check that `config.js` has correct URL and key
- Ensure `schema.sql` was run in Supabase SQL Editor
- Check browser console for API errors

### Data not persisting
- Verify Supabase project is active (not paused)
- Check that tables were created correctly
- Try refreshing the page

### CORS errors
- Supabase handles CORS automatically
- If issues persist, check Supabase API settings

---

## 📄 License

Free to use and modify for educational purposes.

---

## 🙋 Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Supabase project status
3. Ensure all setup steps were followed

**Built with ❤️ for Class Representatives everywhere!**
