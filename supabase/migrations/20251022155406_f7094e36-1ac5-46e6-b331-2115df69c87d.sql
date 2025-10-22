-- Create a function to delete all stories and their cartoon panels for a user
CREATE OR REPLACE FUNCTION delete_all_user_stories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all cartoon panels for the user's stories
  DELETE FROM cartoon_panels
  WHERE story_id IN (
    SELECT id FROM stories WHERE user_id = p_user_id
  );
  
  -- Delete all stories for the user
  DELETE FROM stories WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_all_user_stories(UUID) TO authenticated;