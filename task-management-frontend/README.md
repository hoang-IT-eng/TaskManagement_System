# 🚀 Task Management Frontend - React TypeScript

Modern React application for managing projects and tasks, built with TypeScript and connected to ASP.NET Core Web API.

## ✨ Features

### 🔐 Authentication
- User registration and login
- JWT token-based authentication
- Protected routes
- Auto-redirect on token expiration

### 📊 Dashboard
- Overview of all projects
- Quick statistics (total projects, tasks, completion rate)
- Recent projects display
- Visual progress bars

### 📂 Project Management
- Create, view, edit, and delete projects
- Project status tracking (Planning, InProgress, Completed, OnHold, Cancelled)
- Priority levels (Low, Medium, High, Critical)
- Budget tracking
- Project owner identification

### 📝 Task Management
- Create tasks within projects
- Task status workflow (Todo, InProgress, InReview, Done, Cancelled)
- Priority assignment
- Due date tracking
- Assignee management
- Task descriptions and details

### 📈 Reports & Statistics
- User performance metrics
- Project completion rates
- Task distribution by status
- Personal productivity tracking
- System-wide analytics

### ⚙️ Admin Panel (Admin Only)
- User management
- Role assignment (Admin, ProjectManager, Member)
- System statistics overview
- User activity monitoring

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router v6** - Navigation
- **Axios** - API communication
- **CSS3** - Styling with custom design system
- **Context API** - State management

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Backend API running** on `http://localhost:5000`

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd task-management-frontend
npm install
```

Or with yarn:

```bash
yarn install
```

### 2. Configure API URL

The API base URL is configured in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

Change this if your backend runs on a different port.

### 3. Start Development Server

```bash
npm start
```

Or:

```bash
yarn start
```

The application will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## 📁 Project Structure

```
task-management-frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/             # Reusable components
│   │   └── Navbar.tsx         # Navigation bar
│   ├── contexts/              # React Context providers
│   │   └── AuthContext.tsx    # Authentication context
│   ├── pages/                 # Page components
│   │   ├── Login.tsx          # Login page
│   │   ├── Register.tsx       # Registration page
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Projects.tsx       # Projects list
│   │   ├── ProjectDetail.tsx  # Project details & tasks
│   │   ├── Reports.tsx        # Statistics & reports
│   │   └── AdminPanel.tsx     # Admin user management
│   ├── services/              # API services
│   │   └── api.ts             # API client with all endpoints
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # All type interfaces
│   ├── App.tsx                # Main app component with routing
│   ├── index.tsx              # App entry point
│   └── index.css              # Global styles
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🎨 Design System

The application uses a custom CSS design system with:

- **Color Palette**: Primary (Blue), Success (Green), Danger (Red), Warning (Orange)
- **Typography**: System fonts with responsive sizing
- **Components**: Buttons, Cards, Forms, Badges, Modals
- **Layout**: Flexbox and Grid-based responsive layout
- **Utilities**: Spacing, typography, color utilities

### Key CSS Classes

```css
/* Buttons */
.btn                  - Base button
.btn-primary          - Primary action button
.btn-secondary        - Secondary button
.btn-danger           - Danger/delete button
.btn-sm, .btn-lg      - Size variants

/* Layout */
.container            - Max-width container with padding
.card                 - Card container with shadow
.flex-between         - Flex with space-between
.grid, .grid-2, .grid-3, .grid-4  - Grid layouts

/* Forms */
.input                - Form input styling
.form-group           - Form group spacing
.form-label           - Form label styling

/* Badges */
.badge                - Badge component
.badge-primary, .badge-success, etc. - Color variants
```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` file in the root:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Then update `src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

### CORS Configuration

Ensure your backend API has CORS configured to allow requests from `http://localhost:3000`:

```csharp
// In Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

app.UseCors("AllowReactApp");
```

## 📱 Responsive Design

The application is fully responsive and works on:

- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1440px+)

## 🔐 Authentication Flow

1. User logs in with email/password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token attached to all API requests via Axios interceptor
5. On 401 error, user redirected to login

```typescript
// Auth usage example
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // Use authentication state
}
```

## 🌐 API Integration

All API calls are centralized in `src/services/api.ts`:

```typescript
import { apiService } from './services/api';

// Login
const response = await apiService.login({ email, password });

// Get projects
const projects = await apiService.getProjects();

// Create task
const task = await apiService.createTask(projectId, taskData);
```

## 🎯 Available Routes

| Route | Component | Auth Required | Admin Only |
|-------|-----------|---------------|------------|
| `/` | Redirect to /dashboard | Yes | No |
| `/login` | Login | No | No |
| `/register` | Register | No | No |
| `/dashboard` | Dashboard | Yes | No |
| `/projects` | Projects List | Yes | No |
| `/projects/:id` | Project Detail | Yes | No |
| `/reports` | Reports & Stats | Yes | No |
| `/admin` | Admin Panel | Yes | Yes |

## 🐛 Troubleshooting

### API Connection Issues

**Problem**: "Network Error" when calling API

**Solutions**:
1. Ensure backend is running on `http://localhost:5000`
2. Check CORS configuration in backend
3. Verify API_BASE_URL in `src/services/api.ts`

### Authentication Issues

**Problem**: Logged in but redirected to login

**Solutions**:
1. Check token in localStorage: `localStorage.getItem('token')`
2. Verify token is not expired
3. Check browser console for 401 errors

### Build Errors

**Problem**: TypeScript errors during build

**Solutions**:
1. Run `npm install` to ensure all dependencies installed
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check TypeScript version: `npx tsc --version`

## 📦 Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests (if configured)
npm test

# Eject from Create React App (irreversible!)
npm run eject
```

## 🎨 Customization

### Change Theme Colors

Edit `src/index.css`:

```css
:root {
  --primary: #3b82f6;      /* Main brand color */
  --success: #10b981;      /* Success state */
  --danger: #ef4444;       /* Error/danger state */
  --warning: #f59e0b;      /* Warning state */
  /* ... more colors */
}
```

### Add New Features

1. Create component in `src/components/` or `src/pages/`
2. Add route in `src/App.tsx` if needed
3. Connect to API in `src/services/api.ts`
4. Add TypeScript types in `src/types/index.ts`

## 🤝 Integration with Backend

This frontend is designed to work with the Task Management ASP.NET Core Web API.

**Backend Requirements:**
- Running on `http://localhost:5000`
- CORS enabled for `http://localhost:3000`
- JWT authentication configured
- All API endpoints implemented

**API Endpoints Used:**
- `/api/auth/login` - User authentication
- `/api/auth/register` - User registration
- `/api/project/*` - Project management
- `/api/project/{id}/tasks/*` - Task management
- `/api/reports/*` - Statistics & reports
- `/api/admin/*` - Admin operations

## 🚀 Deployment

### Deploy to Production

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy `build/` folder to:**
   - Netlify
   - Vercel
   - GitHub Pages
   - AWS S3 + CloudFront
   - Azure Static Web Apps

3. **Update API URL:**
   - Change `API_BASE_URL` to production API
   - Use environment variables

### Example: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

## 📊 Performance

- **Lazy Loading**: Routes can be lazy-loaded for better performance
- **Code Splitting**: Automatic code splitting with Create React App
- **Caching**: API responses can be cached with React Query
- **Optimization**: Production build is minified and optimized

## 🔒 Security

- ✅ JWT tokens stored in localStorage
- ✅ Automatic token expiration handling
- ✅ Protected routes with authentication checks
- ✅ Admin-only routes protected
- ✅ Input validation on forms
- ✅ XSS protection with React's default escaping

## 📝 Future Enhancements

- [ ] File attachment upload UI
- [ ] Real-time notifications with SignalR
- [ ] Dark mode toggle
- [ ] Advanced filtering and search
- [ ] Drag-and-drop task management
- [ ] Calendar view for tasks
- [ ] Team collaboration features
- [ ] Export reports to PDF/Excel

## 🐛 Known Issues

- File upload UI not yet implemented (API ready)
- No real-time updates (requires SignalR)
- Limited mobile touch gestures

## 📄 License

This project is part of the Task Management System.

## 👨‍💻 Support

For issues or questions:
- Check the backend API documentation
- Review browser console for errors
- Verify API is running and accessible

---

**Built with ❤️ using React & TypeScript**

**Ready to manage your projects efficiently!** 🚀


