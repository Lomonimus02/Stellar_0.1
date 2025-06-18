-- Migration: Remove primary role system and use only user_roles table
-- Date: 2025-01-15

-- Step 1: Ensure all users have at least one role in user_roles table
-- Copy primary role to user_roles if it doesn't exist there
INSERT INTO user_roles (user_id, role, school_id, class_id)
SELECT 
    u.id,
    u.role,
    u.school_id,
    NULL as class_id
FROM users u
WHERE u.role IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id 
    AND ur.role = u.role
    AND (ur.school_id = u.school_id OR (ur.school_id IS NULL AND u.school_id IS NULL))
);

-- Step 2: For users who have active_role but no corresponding user_role, add it
INSERT INTO user_roles (user_id, role, school_id, class_id)
SELECT 
    u.id,
    u.active_role,
    u.school_id,
    NULL as class_id
FROM users u
WHERE u.active_role IS NOT NULL
AND u.active_role != u.role
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id 
    AND ur.role = u.active_role
);

-- Step 3: Set active_role to the first available role if it's NULL or invalid
UPDATE users 
SET active_role = (
    SELECT ur.role 
    FROM user_roles ur 
    WHERE ur.user_id = users.id 
    ORDER BY ur.id 
    LIMIT 1
)
WHERE active_role IS NULL
OR NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = users.id 
    AND ur.role = users.active_role
);

-- Step 4: Remove the role column from users table
ALTER TABLE users DROP COLUMN role;

-- Verification queries (commented out, uncomment to run manually)
-- SELECT 'Users without any roles' as check, COUNT(*) as count 
-- FROM users u 
-- WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);

-- SELECT 'Users with invalid active_role' as check, COUNT(*) as count 
-- FROM users u 
-- WHERE u.active_role IS NOT NULL 
-- AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = u.active_role);

-- SELECT 'Sample users after migration' as check, 
--        u.id, u.username, u.active_role, 
--        COUNT(ur.id) as total_roles,
--        STRING_AGG(ur.role, ', ') as all_roles
-- FROM users u 
-- LEFT JOIN user_roles ur ON u.id = ur.user_id 
-- GROUP BY u.id, u.username, u.active_role 
-- ORDER BY u.id LIMIT 10;
