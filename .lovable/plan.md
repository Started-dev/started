

# Enhanced User Profile & Settings

Currently the Account tab only shows the user's email, join date, User ID, and a sign-out button. Here's the plan to make it a full-featured settings experience.

## What We'll Add

### 1. Profiles Table (Database)
Create a `profiles` table to store editable user data:
- `id` (UUID, PK, references auth.users)
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text, max 280 chars)
- `created_at`, `updated_at`

A database trigger will auto-create a profile row when a new user signs up. RLS policies will ensure users can only read/update their own profile.

### 2. Profile Settings Section (Account Tab)
Replace the current read-only account card with an editable form:
- **Avatar**: Clickable circle that opens a file picker; uploads to Lovable Cloud storage and saves the URL
- **Display Name**: Text input (used in collaboration features / presence avatars)
- **Bio**: Short textarea
- **Save** button with loading state and success toast

### 3. Security Section Improvements
Add practical security actions below the existing User ID display:
- **Change Password**: Email + new password form that calls the auth password update API
- **Active Sessions**: Show current session info (last sign-in time)

### 4. New "Preferences" Tab
Add a third sidebar tab for IDE preferences:
- **Theme**: Light / Dark / System toggle (wired to the existing `next-themes` dependency)
- **Editor Font Size**: Slider (14-22px), saved to `localStorage`
- **Default Agent Preset**: Dropdown populated from the `agent_presets` table

### 5. Sidebar Navigation Update
Add the new "Preferences" tab to the settings sidebar alongside Billing and Account.

---

## Technical Details

### Database Migration
```sql
-- profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Storage Bucket
Create an `avatars` storage bucket (public read, authenticated upload) for profile pictures.

### Files Changed
- **New migration**: `supabase/migrations/..._create_profiles.sql`
- **`src/pages/UserSettings.tsx`**: Expand Account tab with profile form, add Preferences tab, add password change section
- **`src/contexts/AuthContext.tsx`**: Add `profile` state and a `refreshProfile` helper so the display name / avatar is available app-wide
- **`src/components/ide/PresenceAvatars.tsx`**: Use `profile.display_name` and `profile.avatar_url` instead of raw email

### No Breaking Changes
The existing Billing tab and sign-out flow remain untouched. The new profile row is auto-created for existing users on their next settings page visit (upsert fallback).
