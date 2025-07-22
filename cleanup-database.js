const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables")
  console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDatabase() {
  console.log("🧹 Starting database cleanup...")

  try {
    // 1. Delete all game participants
    console.log("🗑️  Deleting all game participants...")
    const { error: participantsError } = await supabase.from("game_participants").delete().not("id", "is", null) // Delete all rows

    if (participantsError) {
      console.error("❌ Error deleting game participants:", participantsError)
    } else {
      console.log("✅ All game participants deleted")
    }

    // 2. Delete all game logs
    console.log("🗑️  Deleting all game logs...")
    const { error: logsError } = await supabase.from("game_logs").delete().not("id", "is", null) // Delete all rows

    if (logsError) {
      console.error("❌ Error deleting game logs:", logsError)
    } else {
      console.log("✅ All game logs deleted")
    }

    // 3. Delete all games (including waiting games)
    console.log("🗑️  Deleting all games...")
    const { error: gamesError } = await supabase.from("games").delete().not("id", "is", null) // Delete all rows

    if (gamesError) {
      console.error("❌ Error deleting games:", gamesError)
    } else {
      console.log("✅ All games deleted")
    }

    // 4. Check if any data remains
    console.log("🔍 Checking remaining data...")

    const { data: remainingGames, error: gamesCheckError } = await supabase.from("games").select("*")

    const { data: remainingParticipants, error: participantsCheckError } = await supabase
      .from("game_participants")
      .select("*")

    const { data: remainingLogs, error: logsCheckError } = await supabase.from("game_logs").select("*")

    if (gamesCheckError || participantsCheckError || logsCheckError) {
      console.error("❌ Error checking remaining data")
    } else {
      console.log("📊 Database state after cleanup:")
      console.log(`   - Games: ${remainingGames?.length || 0}`)
      console.log(`   - Participants: ${remainingParticipants?.length || 0}`)
      console.log(`   - Logs: ${remainingLogs?.length || 0}`)
    }

    console.log("✅ Database cleanup completed successfully!")
    console.log("🚀 The app will now start fresh when users visit")
  } catch (error) {
    console.error("❌ Unexpected error during cleanup:", error)
    process.exit(1)
  }
}

// Run cleanup
cleanupDatabase()
  .then(() => {
    console.log("🎉 Cleanup finished! Your PvP Wheel is ready for fresh games.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Cleanup failed:", error)
    process.exit(1)
  })
