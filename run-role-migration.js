#!/usr/bin/env node

/**
 * Migration script to remove primary role system
 * This script migrates from role field in users table to user_roles table only
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/school_management'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting role system migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', 'remove_primary_role_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    
    // Execute the migration
    console.log('Executing migration...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
    
    // Run verification queries
    console.log('\nRunning verification queries...');
    
    const usersWithoutRoles = await client.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
    `);
    console.log(`Users without any roles: ${usersWithoutRoles.rows[0].count}`);
    
    const usersWithInvalidActiveRole = await client.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      WHERE u.active_role IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = u.active_role)
    `);
    console.log(`Users with invalid active_role: ${usersWithInvalidActiveRole.rows[0].count}`);
    
    const sampleUsers = await client.query(`
      SELECT u.id, u.username, u.active_role, 
             COUNT(ur.id) as total_roles,
             STRING_AGG(ur.role, ', ') as all_roles
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      GROUP BY u.id, u.username, u.active_role 
      ORDER BY u.id LIMIT 5
    `);
    
    console.log('\nSample users after migration:');
    console.table(sampleUsers.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
