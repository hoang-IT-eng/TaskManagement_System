# 🚀 React Frontend - Quick Start Guide

## ⚡ TL;DR - Get Running in 3 Minutes

```bash
# 1. Navigate to frontend folder
cd task-management-frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start the app
npm start

# 4. Open browser to http://localhost:3000
```

**That's it!** The app will open automatically. 🎉

---

## 📋 Prerequisites Check

Before starting, make sure you have:

### ✅ Node.js Installed

```bash
node --version
# Should show v16.0.0 or higher
```

**Don't have Node.js?** [Download here](https://nodejs.org/) (Get the LTS version)

### ✅ Backend API Running

The React frontend needs the ASP.NET Core backend API running:

```bash
# In another terminal, start backend
cd TaskManagement.API
dotnet run

# Should show: Now listening on: http://localhost:5000
```

---

## 🎯 Step-by-Step First Run

### Step 1: Open Frontend Folder

```bash
cd task-management-frontend
```

### Step 2: Install Dependencies

This downloads all required packages (React, TypeScript, etc.)

```bash
npm install
```

**This takes 2-3 minutes.** You'll see:
```
added 1500+ packages in 2m
```

### Step 3: Start Development Server

```bash
npm start
```

You'll see:
```
Compiled successfully!

You can now view task-management-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.x:3000
```

### Step 4: Open Browser

The browser should open automatically to `http://localhost:3000`

If not, manually open: **http://localhost:3000**

---

## 🎨 First Time Setup

### Create Your Account

1. You'll see the **Login page** (beautiful gradient background!)
2. Click **"Register here"** link
3. Fill in:
   - **Full Name**: Your name
   - **Email**: your@email.com
   - **Password**: At least 6 characters
   - **Confirm Password**: Same as password
4. Click **"Create Account"**
5. You're automatically logged in! 🎉

### Explore the Dashboard

After registration, you'll see:
- **Welcome message** with your name
- **4 statistics cards** (currently showing 0)
- **Empty projects section**
- **Navigation bar** at the top

---

## 💡 Quick Tour - What Can You Do?

### 1. Create Your First Project

**From Dashboard:**
- Click the **"+ New Project"** button (top right)

**OR from Projects page:**
- Click **"Projects"** in navbar
- Click **"+ New Project"** button

**Fill in the modal:**
- **Project Name**: "My First Project" ✅ (required)
- **Description**: "Learning task management"
- **Status**: InProgress
- **Priority**: High
- **Start Date**: Today's date
- **End Date**: Next week
- **Budget**: 5000 (optional)

**Click "Create Project"** ✅

**You'll see:**
- Your new project card appears
- It shows project name, description, status badge
- Progress bar (0% since no tasks yet)

### 2. Add Tasks to Your Project

**Click on your project card** to open it

**On Project Detail page:**
- Click **"+ Add Task"** button
- Fill in task details:
  - **Title**: "Create project documentation" ✅
  - **Description**: "Write comprehensive README"
  - **Status**: InProgress
  - **Priority**: High
  - **Due Date**: Tomorrow
- Click **"Create Task"** ✅

**Your task appears below!**

Create a few more tasks to see the dashboard come alive.

### 3. View Reports

**Click "Reports" in navbar**

You'll see:
- **Your Performance** section
  - Assigned tasks count
  - Completed tasks count
  - Completion rate percentage
- **Projects Overview**
  - All your projects with statistics
  - Visual progress bars
  - Task breakdown

### 4. Update Task Status

Currently, you need to use the API to update tasks. Task editing UI coming soon!

---

## 🎨 Understanding the Interface

### Navigation Bar (Top)

- **📋 Task Management** - Logo (click to go home)
- **Dashboard** - Overview of everything
- **Projects** - Manage all projects
- **Reports** - Statistics and analytics
- **Admin** - Only visible if you're admin
- **User Menu** - Shows your name and Logout button

### Color System

**Status Badges:**
- 🟢 **Green** = Completed/Done
- 🔵 **Blue** = InProgress
- 🟡 **Yellow** = OnHold/Planning
- 🔴 **Red** = Cancelled
- ⚪ **Gray** = Todo

**Priority Badges:**
- 🔴 **Red** = Critical/Urgent
- 🟡 **Yellow** = High
- 🔵 **Blue** = Medium
- ⚪ **Gray** = Low

### Cards & Buttons

**Hover Effects:**
- Cards lift up slightly on hover
- Buttons show darker shade on hover

**Badges:**
- Small colored labels showing status/priority
- Help you quickly identify important items

---

## 🔐 User Roles

### Member (Default)
- Create and manage own projects
- View projects you're a member of
- Create and manage tasks
- View personal reports

### ProjectManager
- Same as Member
- Can manage team members (when UI implemented)

### Admin
- Everything Member can do
- Access **Admin Panel**
- View all users in system
- Change user roles
- View system-wide statistics

**To test Admin features:**
1. Register your first user
2. Use Swagger or PowerShell to change role to "Admin"
3. Refresh frontend - Admin menu appears!

---

## 🐛 Troubleshooting

### Problem: "npm: command not found"

**Solution:** Install Node.js from https://nodejs.org/

### Problem: "Port 3000 is already in use"

**Solution:** 
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

Or run on different port:
```bash
PORT=3001 npm start
```

### Problem: "Network Error" when logging in

**Causes:**
1. Backend API not running
2. Backend on wrong port
3. CORS not configured

**Solutions:**
1. Start backend: `cd TaskManagement.API && dotnet run`
2. Check backend is on `http://localhost:5000`
3. Verify CORS in backend Program.cs allows `http://localhost:3000`

### Problem: Page is blank

**Solution:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Common issue: API_BASE_URL wrong in `src/services/api.ts`

### Problem: Cannot register user

**Possible Causes:**
- Email already exists
- Password too short (min 6 characters)
- Backend database not configured

**Solution:**
- Try different email
- Use stronger password
- Check backend API is working (test with Swagger)

---

## 🎯 Common Tasks

### How to Create Multiple Projects Quickly

```bash
# Use the UI or script it!
# In browser console (F12):

for (let i = 1; i <= 5; i++) {
  fetch('http://localhost:5000/api/project', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `Project ${i}`,
      description: `Test project number ${i}`,
      status: 'InProgress',
      priority: 'Medium'
    })
  });
}
```

### How to Get Your Auth Token

```javascript
// In browser console (F12):
localStorage.getItem('token')
```

### How to Clear All Data (Fresh Start)

```javascript
// In browser console (F12):
localStorage.clear()
// Then refresh page
```

---

## 📱 Mobile Testing

### On Your Phone/Tablet

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address: 192.168.x.x

   # Mac/Linux
   ifconfig
   # Look for inet address
   ```

2. On your phone browser, go to:
   ```
   http://192.168.x.x:3000
   ```

3. Make sure phone and computer on same WiFi network

---

## 🚀 Development Tips

### Hot Reload

Any changes you make to code **automatically refresh** the browser!

Try it:
1. Open `src/pages/Dashboard.tsx`
2. Change welcome message
3. Save file
4. Browser refreshes instantly!

### React DevTools

Install React DevTools browser extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

Then you can inspect React components in DevTools!

### Folder Structure Tour

```bash
src/
├── components/        # Reusable UI components
├── contexts/          # Global state (auth)
├── pages/            # Full page components
├── services/         # API calls
├── types/            # TypeScript types
├── App.tsx           # Main app with routing
├── index.tsx         # Entry point
└── index.css         # Global styles
```

**Want to customize?**
- Colors: Edit `src/index.css` (CSS variables)
- API URL: Edit `src/services/api.ts`
- Pages: Add new in `src/pages/`
- Routes: Update `src/App.tsx`

---

## 🎓 Learning Resources

### Understand the Code

**React Basics:**
- Components are functions that return JSX
- `useState` for component state
- `useEffect` for side effects (API calls)
- `useContext` for global state

**TypeScript:**
- All variables have types
- Interfaces define object shapes
- Hover over code to see types in VS Code

**Example Component:**
```typescript
// Simple counter component
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

---

## 📦 Building for Production

When ready to deploy:

```bash
# Create optimized build
npm run build

# Output in build/ folder
# Deploy this folder to:
# - Netlify
# - Vercel  
# - GitHub Pages
# - Any static hosting
```

---

## 🎉 Next Steps

1. **Explore**: Click around, create projects and tasks
2. **Customize**: Change colors, add features
3. **Learn**: Study the code, understand React patterns
4. **Extend**: Add file upload UI, task editing, more features
5. **Deploy**: Share with your team!

---

## 💬 Need Help?

### Check These First:
1. **README.md** - Comprehensive documentation
2. **REACT_FRONTEND_SUMMARY.md** - Technical details
3. **Browser Console** (F12) - Error messages
4. **Backend Swagger** - http://localhost:5000

### Common Questions:

**Q: Can I use this with different backend?**
A: Yes! Just update `API_BASE_URL` in `src/services/api.ts`

**Q: Can I add more pages?**
A: Absolutely! Create in `src/pages/`, add route in `App.tsx`

**Q: Can I use Material-UI or Tailwind?**
A: Yes, but current CSS system is already complete and lightweight

**Q: How do I add dark mode?**
A: CSS variables are ready, just need toggle button and theme context

---

## 🎨 Customization Examples

### Change Primary Color

Edit `src/index.css`:
```css
:root {
  --primary: #3b82f6;    /* Change this! */
  --primary-dark: #2563eb;
}
```

### Add New Page

1. Create `src/pages/NewPage.tsx`:
```typescript
function NewPage() {
  return <div className="container">
    <h1>My New Page</h1>
  </div>;
}
export default NewPage;
```

2. Add route in `src/App.tsx`:
```typescript
<Route path="/new" element={
  <PrivateRoute><NewPage /></PrivateRoute>
} />
```

3. Add nav link in `Navbar.tsx`

---

**You're all set!** Start building amazing things! 🚀

**Happy coding!** 💻✨


