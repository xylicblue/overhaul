// generateData.js — Price data seeder (run manually)
// Uses env vars for connection — NEVER hardcode keys
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://basxvmmtxwlxylpukqjj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generatePriceData() {
  const dataToInsert = [];
  let currentPrice = 175.5; // Starting price
  const now = new Date();

  // Generate data for the last 24 hours, in 15-minute intervals
  for (let i = 96; i >= 0; i--) {
    // 24 hours * 4 intervals per hour
    const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);

    // Simulate a "random walk" for the price
    const change = (Math.random() - 0.49) * 2;
    currentPrice += change;
    currentPrice = Math.max(currentPrice, 50); // Don't let it go too low

    dataToInsert.push({
      price: currentPrice.toFixed(2),
      timestamp: timestamp.toISOString(),
    });
  }

  console.log(
    `Generated ${dataToInsert.length} data points. Inserting into Supabase...`
  );

  // Insert the data into the 'price_data' table
  const { error } = await supabase.from("price_data").insert(dataToInsert);

  if (error) {
    console.error("Error inserting data:", error);
  } else {
    console.log("Successfully inserted price data!");
  }
}

generatePriceData();
