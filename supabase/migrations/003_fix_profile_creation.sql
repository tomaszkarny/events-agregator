-- Fix profile creation with proper RLS policies

-- 1. Drop existing trigger to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create improved function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'USER',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail auth
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add RLS policy for service role to create profiles (for edge cases)
CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Fix the insert policy to allow users to create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Ensure child_profiles policies are correct
DROP POLICY IF EXISTS "Users can create own child profiles" ON public.child_profiles;
CREATE POLICY "Users can create own child profiles" ON public.child_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- 7. Create a helper function for safe profile creation
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_auth auth.users;
BEGIN
  -- Get current user from auth.users
  SELECT * INTO user_auth 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_auth.id IS NOT NULL THEN
    -- Insert or update profile
    INSERT INTO public.profiles (id, email, name, created_at)
    VALUES (
      user_auth.id,
      user_auth.email,
      COALESCE(
        user_auth.raw_user_meta_data->>'name',
        split_part(user_auth.email, '@', 1)
      ),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      last_login_at = NOW();
  END IF;
END;
$$;

-- 8. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;

-- 9. Create profiles for existing users who might be missing them
INSERT INTO public.profiles (id, email, name, created_at)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;