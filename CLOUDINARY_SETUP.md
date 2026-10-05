# Cloudinary Setup Guide for Taste Trail

## Step 1: Create a Cloudinary Account
1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Get Your Credentials
1. Log in to your Cloudinary dashboard
2. You'll see your **Cloud Name** at the top of the dashboard
3. Copy your Cloud Name (e.g., "your-cloud-name")

## Step 3: Create an Upload Preset
1. In the Cloudinary dashboard, go to **Settings** (gear icon)
2. Click on the **Upload** tab
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Set the following:
   - **Preset name**: `taste_trail_recipes` (or any name you prefer)
   - **Signing Mode**: Select **Unsigned** (important for mobile uploads)
   - **Folder**: `recipes` (optional, helps organize images)
6. Click **Save**

## Step 4: Update Your Code
Open `src/app/(tabs)/addRecipe.tsx` and replace these lines:

```typescript
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME'; // Replace with your Cloud Name
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'; // Replace with your preset name
```

Example:
```typescript
const CLOUDINARY_CLOUD_NAME = 'dxyz123abc'; // Your actual cloud name
const CLOUDINARY_UPLOAD_PRESET = 'taste_trail_recipes'; // Your preset name
```

## Step 5: Test
1. Run your app: `npx expo start`
2. Go to the Add Recipe screen
3. Click "Add a photo"
4. Select an image from your gallery
5. Save the recipe
6. Check your Cloudinary Media Library to see the uploaded image

## Free Tier Limits
- 25 GB storage
- 25 GB bandwidth per month
- Perfect for development and small apps!

## Security Note
For production apps, consider:
- Using signed uploads
- Setting up transformation rules
- Implementing user quotas
