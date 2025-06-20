#!/usr/bin/env node

/**
 * Rollback script for the role system migration
 * This script reverts the role system back to the original state
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/school_management'
});

async function rollbackMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting role system rollback...');
    
    await client.query('BEGIN');
    
    // Step 1: Restore the role field as NOT NULL
    console.log('Step 1: Making role field NOT NULL again...');
    
    // First, ensure all users have a role set
    const usersWithoutRole = await client.query(`
      SELECT id, username FROM users WHERE role IS NULL
    `);
    
    if (usersWithoutRole.rows.length > 0) {
      console.log(`Found ${usersWithoutRole.rows.length} users without role, setting default roles...`);
      
      // Set default role for users without role based on their user_roles
      await client.query(`
        UPDATE users 
        SET role = (
          SELECT ur.role 
          FROM user_roles ur 
          WHERE ur.user_id = users.id 
          ORDER BY ur.id 
          LIMIT 1
        )
        WHERE role IS NULL
        AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id)
      `);
      
      // For users without any roles, set them as students
      await client.query(`
        UPDATE users 
        SET role = 'student'
        WHERE role IS NULL
      `);
    }
    
    // Now make the role field NOT NULL
    await client.query(`
      ALTER TABLE users ALTER COLUMN role SET NOT NULL
    `);
    
    // Step 2: Clean up user_roles table - remove entries that duplicate the main role
    console.log('Step 2: Cleaning up duplicate roles in user_roles table...');
    
    const duplicateRoles = await client.query(`
      DELETE FROM user_roles ur
      WHERE EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = ur.user_id 
        AND u.role = ur.role
        AND ur.school_id = u.school_id
      )
      RETURNING user_id, role
    `);
    
    console.log(`Removed ${duplicateRoles.rows.length} duplicate role entries`);
    
    // Step 3: Ensure all users have an active_role set to their main role
    console.log('Step 3: Setting active_role to main role for all users...');
    
    await client.query(`
      UPDATE users 
      SET active_role = role 
      WHERE active_role IS NULL OR active_role != role
    `);
    
    // Step 4: Remove the deprecation comment
    console.log('Step 4: Removing deprecation comment from role field...');
    
    await client.query(`
      COMMENT ON COLUMN users.role IS NULL
    `);
    
    await client.query('COMMIT');
    console.log('Rollback completed successfully!');
    
    // Verify the rollback
    const result = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.role,
        u.active_role,
        COUNT(ur.id) as additional_roles_count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      GROUP BY u.id, u.username, u.role, u.active_role
      ORDER BY u.id
      LIMIT 10
    `);
    
    console.log('\nRollback verification (first 10 users):');
    console.table(result.rows);
    
    // Check for any issues
    const issues = await client.query(`
      SELECT 
        'Users without role' as issue,
        COUNT(*) as count
      FROM users 
      WHERE role IS NULL
      
      UNION ALL
      
      SELECT 
        'Users with active_role != role' as issue,
        COUNT(*) as count
      FROM users 
      WHERE active_role != role
    `);
    
    console.log('\nIssues check:');
    console.table(issues.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await rollbackMigration();
    console.log('\n✅ Role system rollback completed successfully!');
    console.log('The database has been restored to the original role system state.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

// Run the rollback
main();
