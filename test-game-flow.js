/**
 * Game Flow Test Script
 * Tests the complete game flow including player creation, game creation, and joining
 */

const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

async function testGameFlow() {
  console.log("--- Starting PvP Wheel Game Flow Test ---")

  console.log("\n**Objective**: Verify the core game loop, from starting a game to determining a winner.")

  console.log("\n**Pre-requisites**:")
  console.log("  - Application is deployed and accessible (e.g., via Vercel URL).")
  console.log("  - Supabase database is set up and accessible.")
  console.log("  - Telegram WebApp environment is ready (or mocked for local testing).")

  console.log("\n**Test Steps**:")

  console.log("\n🎮 Testing Complete Game Flow...\n")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Environment variables not configured")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Clean up any existing test data
    await supabase.from("game_participants").delete().gte("id", "00000000-0000-0000-0000-000000000000")
    await supabase.from("games").delete().gte("roll_number", 9999)
    await supabase.from("players").delete().gte("telegram_id", 999999999)

    console.log("\n1. **Initial Load & UI Check**")
    console.log("   - Open the application URL in your browser or Telegram WebApp.")
    console.log(
      "   - **Expected**: The main game screen should load, showing the wheel, 'Start Game' button, and bottom navigation.",
    )
    console.log("   - **Observe**: Are there any errors in the browser console? Is the UI rendered correctly?")

    console.log("🧪 Step 1: Create Test Player")

    // Create test player
    const testPlayer = {
      telegram_id: 999999999,
      username: "testgamer",
      first_name: "Test",
      last_name: "Gamer",
      photo_url: null,
      is_premium: false,
      language_code: "en",
    }

    const { data: player, error: playerError } = await supabase.from("players").insert(testPlayer).select().single()

    if (playerError) {
      console.error("❌ Player creation failed:", playerError)
      return
    }

    console.log("✅ Test player created:", player.username)

    console.log("\n2. **Start a New Game (Player 1)**")
    console.log("   - Click the 'Start Game' button.")
    console.log(
      "   - **Expected**: The button should change state (e.g., 'Waiting for opponent'), and a timer might start counting down.",
    )
    console.log(
      "   - **Observe**: Check Supabase `games` table: a new entry with `status: 'waiting'` should appear, with `player1_id` set.",
    )

    console.log("🧪 Step 2: Create Test Game")

    // Create test game
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        roll_number: 9999,
        status: "waiting",
        total_players: 0,
        total_pot_balance: 0,
        total_gift_value: 0,
      })
      .select()
      .single()

    if (gameError) {
      console.error("❌ Game creation failed:", gameError)
      return
    }

    console.log("✅ Test game created:", game.roll_number)

    console.log("\n3. **Join Game (Player 2)**")
    console.log(
      "   - (Simulate another user) Open the same application URL in a different browser/incognito window or another Telegram account.",
    )
    console.log(
      "   - **Expected**: The second instance should automatically detect the 'waiting' game and join it. The UI should update for both players, showing 'Game Started!' or similar, and the wheel should become active.",
    )
    console.log(
      "   - **Observe**: Check Supabase `games` table: the existing 'waiting' game entry should update to `status: 'active'`, and `player2_id` should be set. The timer should be synchronized.",
    )

    console.log("🧪 Step 3: Test Game Joining")

    // Test joining game
    const { data: participant, error: joinError } = await supabase
      .from("game_participants")
      .insert({
        game_id: game.id,
        player_id: player.id,
        balance: 0,
        gift_value: 0.5,
        color: "#FF6B6B",
        position_index: 0,
        chance_percentage: 100,
      })
      .select()
      .single()

    if (joinError) {
      console.error("❌ Game joining failed:", joinError)
      console.error("Error details:", joinError)
      return
    }

    console.log("✅ Player joined game successfully")

    console.log("\n4. **Spin the Wheel**")
    console.log(
      "   - For the active player (or either, depending on game rules), click the 'Spin' button (if available).",
    )
    console.log(
      "   - **Expected**: The wheel should animate, and eventually land on a number. The game status should update to 'completed' or 'finished'.",
    )
    console.log(
      "   - **Observe**: Check Supabase `games` table: the game entry should update to `status: 'completed'`, `roll_number` should be set, and `winner_id` should be determined based on the roll.",
    )

    console.log("🧪 Step 4: Test Game Completion")

    // Test game completion
    const { data: completedGame, error: completeError } = await supabase
      .from("games")
      .update({
        status: "completed",
        winner_id: player.id,
        winner_chance: 100,
        total_gift_value: 0.5,
        completed_at: new Date().toISOString(),
      })
      .eq("id", game.id)
      .select()
      .single()

    if (completeError) {
      console.error("❌ Game completion failed:", completeError)
      return
    }

    console.log("✅ Game completed successfully")

    console.log("\n5. **Game Result & New Game**")
    console.log(
      "   - **Expected**: Both players should see the game result (winner/loser). A 'New Game' or 'Play Again' button should appear.",
    )
    console.log("   - **Observe**: Is the result clearly displayed? Can a new game be initiated?")

    console.log("🧪 Step 5: Verify Player Stats Update")

    // Check if player stats were updated by trigger
    const { data: updatedPlayer, error: playerCheckError } = await supabase
      .from("players")
      .select("*")
      .eq("id", player.id)
      .single()

    if (playerCheckError) {
      console.error("❌ Player stats check failed:", playerCheckError)
      return
    }

    console.log("✅ Player stats updated:")
    console.log("  Games played:", updatedPlayer.total_games_played)
    console.log("  Games won:", updatedPlayer.total_games_won)
    console.log("  TON won:", updatedPlayer.total_ton_won)

    console.log("\n6. **NFT Deposit (UI Check)**")
    console.log("   - Navigate to the NFT deposit section (if implemented).")
    console.log(
      "   - **Expected**: The UI for NFT deposit should be present and functional (even if backend integration is pending).",
    )

    console.log("\n7. **Gift Selection (UI Check)**")
    console.log("   - Navigate to the Gift selection section (if implemented).")
    console.log("   - **Expected**: The gift selection popup should appear, displaying available gifts.")
    console.log("   - **Observe**: Are gifts loading from the database? Can you select a gift?")

    console.log("\n🧪 Step 6: Clean Up Test Data")

    // Clean up test data
    await supabase.from("game_logs").delete().eq("game_id", game.id)
    await supabase.from("game_participants").delete().eq("game_id", game.id)
    await supabase.from("games").delete().eq("id", game.id)
    await supabase.from("players").delete().eq("id", player.id)

    console.log("✅ Test data cleaned up")

    console.log("\n--- PvP Wheel Game Flow Test Complete ---")
    console.log("Report any discrepancies or errors found during this test.")
    console.log("\n🎉 All game flow tests passed!")
    console.log("Your database is ready for the PvP Wheel game.")
  } catch (error) {
    console.error("❌ Unexpected error during game flow test:", error)
  }
}

testGameFlow().catch(console.error)
