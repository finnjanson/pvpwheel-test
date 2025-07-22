import { createClient } from "@supabase/supabase-js"

async function cleanupDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY // Use service key for cleanup

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log("Starting database cleanup...")

    // Example: Delete all rows from 'games' table
    const { error: gamesError } = await supabase
      .from("games")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all except a dummy row if needed
    if (gamesError) throw gamesError
    console.log('Cleaned up "games" table.')

    // Example: Delete all rows from 'gifts' table (if it's dynamic)
    // const { error: giftsError } = await supabase.from('gifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // if (giftsError) throw giftsError;
    // console.log('Cleaned up "gifts" table.');

    console.log("Database cleanup complete.")
  } catch (error) {
    console.error("Error during database cleanup:", error.message)
  }
}

cleanupDatabase()
