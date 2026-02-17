#!/usr/bin/env python3
import requests
import os
import glob

SUPABASE_URL = "https://lhscrwzcmncfctbuoawu.supabase.co"
SUPABASE_KEY = ""

def run_sql(sql_content):
    """Execute SQL against Supabase using the REST API"""
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        # Use the Supabase PostgreSQL endpoint
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec",
            headers=headers,
            json={"sql": sql_content},
            timeout=30
        )
        return response.status_code, response.text
    except Exception as e:
        return None, str(e)

def main():
    print("🚀 Running Supabase Migrations...")
    print(f"📍 Project: lhscrwzcmncfctbuoawu")
    
    # Get all migration files
    migration_files = sorted(glob.glob("supabase/migrations/*.sql"))
    
    if not migration_files:
        print("❌ No migration files found!")
        return
    
    for migration_file in migration_files:
        print(f"\n📝 Processing: {os.path.basename(migration_file)}")
        
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        status, response = run_sql(sql)
        
        if status == 200:
            print(f"✅ Migration executed successfully")
        elif status is None:
            print(f"⚠️  Could not connect: {response}")
        else:
            print(f"⚠️  Status {status}: {response[:200]}")
    
    print("\n✅ Migration process complete!")
    print("📊 Check your Supabase dashboard to verify tables were created")

if __name__ == "__main__":
    main()
