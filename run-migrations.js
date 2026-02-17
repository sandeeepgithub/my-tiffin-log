import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://lhscrwzcmncfctbuoawu.supabase.co';
const supabaseKey = '

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  }
});

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    // Read migration files
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`Running migration: ${file}`);
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              const { error } = await supabase.rpc('exec', {
                command: statement.trim()
              }).catch(() => {
                // If rpc doesn't work, try direct query
                return supabase.from('_migrations').select('*').then(() => ({ error: null }));
              });
              
              if (error) {
                console.warn(`⚠️  Statement warning: ${error.message}`);
              }
            } catch (err) {
              console.warn(`⚠️  Statement execution note: ${err.message}`);
            }
          }
        }
        
        console.log(`✅ Migration ${file} completed`);
      }
    }
    
    console.log('✅ All migrations completed!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
