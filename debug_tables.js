
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://basxvmmtxwlxylpukqjj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhc3h2bW10eHdseHlscHVrcWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDE5OTQsImV4cCI6MjA2ODY3Nzk5NH0.14XQiB2XmWBJ1louVTlMpJxlj4PTpH9xb14yMGhVfxk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Checking tables...");

  const tables = [
    { name: "price_data", timeField: "timestamp" },
    { name: "b200_index_prices", timeField: "created_at" },
    { name: "h200_index_prices", timeField: "created_at" },
    { name: "b200_provider_prices", timeField: "created_at" },
    { name: "h200_provider_prices", timeField: "created_at" }
  ];

  for (const t of tables) {
    console.log(`\n--- ${t.name} ---`);
    
    // Check count
    const { count, error: countError } = await supabase
      .from(t.name)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`Error counting ${t.name}:`, countError.message);
    } else {
      console.log(`Row count: ${count}`);
    }

    // Check latest row
    const { data, error } = await supabase
      .from(t.name)
      .select('*')
      .order(t.timeField, { ascending: false })
      .limit(1);

    if (error) {
       // If sorting fails, maybe column doesn't exist? Try without sort
       console.error(`Error fetching latest from ${t.name} with sort ${t.timeField}:`, error.message);
       const { data: anyData, error: anyError } = await supabase.from(t.name).select('*').limit(1);
       if (anyData && anyData.length > 0) {
         console.log("Found a row (unsorted):", Object.keys(anyData[0]));
       }
    } else if (data && data.length > 0) {
      console.log(`Latest row keys:`, Object.keys(data[0]));
      console.log(`Latest row sample:`, data[0]);
    } else {
      console.log(`Table is empty.`);
    }
  }
}

checkTables();
