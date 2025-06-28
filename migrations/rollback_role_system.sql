-- Rollback Migration: Revert role system redesign back to original state
-- Date: 2025-01-14

-- Step 1: Ensure all users have a role set before making it NOT NULL
-- Set role for users who don't have one based on their user_roles
UPDATE users 
SET role = (
    SELECT ur.role 
    FROM user_roles ur 
    WHERE ur.user_id = users.id 
    ORDER BY ur.id 
    LIMIT 1
)
WHERE role IS NULL
AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id);

-- For users without any roles, set them as students (fallback)
UPDATE users 
SET role = 'student'
WHERE role IS NULL;

-- Step 2: Make the role field NOT NULL again
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Step 3: Clean up user_roles table - remove entries that duplicate the main role
-- This removes roles from user_roles that are the same as the user's main role
DELETE FROM user_roles ur
WHERE EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = ur.user_id 
    AND u.role = ur.role
    AND (ur.school_id = u.school_id OR (ur.school_id IS NULL AND u.school_id IS NULL))
);

-- Step 4: Set active_role to match the main role for all users
UPDATE users 
SET active_role = role 
WHERE active_role IS NULL OR active_role != role;

-- Step 5: Remove the deprecation comment
COMMENT ON COLUMN users.role IS NULL;

-- Verification queries (commented out, uncomment to run manually)
-- SELECT 'Users without role' as check, COUNT(*) as count FROM users WHERE role IS NULL;
-- SELECT 'Users with mismatched active_role' as check, COUNT(*) as count FROM users WHERE active_role != role;
-- SELECT 'Sample users after rollback' as check, u.id, u.username, u.role, u.active_role, COUNT(ur.id) as additional_roles 
-- FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id 
-- GROUP BY u.id, u.username, u.role, u.active_role 
-- ORDER BY u.id LIMIT 10;
