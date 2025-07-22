import { createClient } from "@supabase/supabase-js"

async function testDatabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log("--- Testing Supabase Database Connection ---")

  try {
    // Test fetching a small amount of data from the 'games' table
    const { data, error } = await supabase.from("games").select("id, status, created_at").limit(1)

    if (error) {
      console.error("Error connecting to Supabase or fetching data:", error.message)
      console.error("Details:", error.details)
      console.error("Hint:", error.hint)
      console.error("Code:", error.code)
      return false
    }

    console.log("Successfully connected to Supabase and fetched data.")
    console.log("Example game data:", data)
    return true
  } catch (e) {
    console.error("An unexpected error occurred during database test:", e.message)
    return false
  } finally {
    console.log("--- Supabase Database Connection Test Complete ---")
  }
}

testDatabaseConnection()
