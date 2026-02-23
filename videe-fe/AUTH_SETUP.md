# Propel Auth Setup Guide

This guide will help you set up Propel Auth in your VIDEE frontend application.

## Prerequisites

1. A Propel Auth account and organization
2. Your Propel Auth Auth URL

## Setup Steps

### 1. Create Environment File

Create a `.env.local` file in the `videe-fe` directory with the following content:

```env
# Propel Auth Configuration
# Replace with your actual Propel Auth URL from your dashboard
NEXT_PUBLIC_AUTH_URL=https://your-org.propelauth.com
```

### 2. Get Your Propel Auth URL

1. Log in to your Propel Auth dashboard
2. Go to your organization settings
3. Copy the Auth URL (it should look like `https://your-org.propelauth.com`)
4. Replace the placeholder in your `.env.local` file

### 3. Configure Propel Auth Settings

In your Propel Auth dashboard:

1. **Redirect URLs**: Add your frontend URLs to the allowed redirect URLs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)

2. **Customization**: Customize the login/signup pages to match your brand colors and styling

### 4. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign Up" or "Sign In" to test the authentication flow

## Features Implemented

- ✅ User authentication with Propel Auth
- ✅ Protected dashboard routes
- ✅ Automatic redirects for unauthenticated users
- ✅ User information display
- ✅ Logout functionality
- ✅ Responsive design with Tailwind CSS

## File Structure

```
videe-fe/
├── src/
│   ├── lib/
│   │   └── propelauth.ts          # Propel Auth configuration
│   ├── hooks/
│   │   └── useAuth.ts             # Custom auth hook
│   ├── components/
│   │   ├── AuthWrapper.tsx        # Client-side auth wrapper
│   │   └── ProtectedRoute.tsx     # Route protection component
│   └── app/
│       ├── layout.tsx             # Root layout with AuthProvider
│       ├── page.tsx               # Landing page with auth buttons
│       ├── auth/
│       │   ├── signin/page.tsx    # Sign in redirect page
│       │   └── signup/page.tsx    # Sign up redirect page
│       └── dashboard/
│           ├── layout.tsx         # Protected dashboard layout
│           └── page.tsx           # Dashboard home page
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Make sure you've installed the Propel Auth package with `npm install @propelauth/react`

2. **Redirect loops**: Check that your redirect URLs are correctly configured in Propel Auth

3. **Environment variable not working**: Ensure your `.env.local` file is in the correct location and the variable name is `NEXT_PUBLIC_AUTH_URL`

### Getting Help

- [Propel Auth Documentation](https://docs.propelauth.com/)
- [Propel Auth React SDK](https://docs.propelauth.com/frontend/react)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables) 