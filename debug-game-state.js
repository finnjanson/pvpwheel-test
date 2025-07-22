import { createClient } from "@supabase/supabase-js"

async function debugGameState() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log("--- Debugging Game State ---")

  try {
    // Fetch all games
    console.log("\nFetching all games...")
    const { data: allGames, error: allGamesError } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })

    if (allGamesError) throw allGamesError
    console.log(`Found ${allGames.length} games:`)
    allGames.forEach((game) => {
      console.log(`  ID: ${game.id}, Status: ${game.status}, Roll: ${game.roll_number}, Created: ${game.created_at}`)
    })

    // Fetch current waiting game
    console.log("\nFetching current waiting game...")
    const { data: waitingGames, error: waitingGamesError } = await supabase
      .from("games")
      .select("*")
      .eq("status", "waiting")
      .limit(1)

    if (waitingGamesError) throw waitingGamesError
    if (waitingGames.length > 0) {
      const game = waitingGames[0]
      console.log(
        `  Current Waiting Game: ID: ${game.id}, Status: ${game.status}, Roll: ${game.roll_number}, Created: ${game.created_at}`,
      )
    } else {
      console.log('  No game currently in "waiting" status.')
    }

    // Fetch recent completed games
    console.log("\nFetching recent completed games...")
    const { data: completedGames, error: completedGamesError } = await supabase
      .from("games")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5)

    if (completedGamesError) throw completedGamesError
    if (completedGames.length > 0) {
      console.log(`Found ${completedGames.length} recent completed games:`)
      completedGames.forEach((game) => {
        console.log(`  ID: ${game.id}, Status: ${game.status}, Roll: ${game.roll_number}, Created: ${game.created_at}`)
      })
    } else {
      console.log("  No recent completed games found.")
    }
  } catch (error) {
    console.error("Error debugging game state:", error.message)
  }

  console.log("--- Game State Debugging Complete ---")
}

debugGameState()
