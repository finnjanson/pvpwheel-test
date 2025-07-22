import { createClient } from "@supabase/supabase-js"

console.log("supabase.ts: Файл supabase.ts загружен.")

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ supabase.ts: Отсутствуют переменные окружения Supabase")
  console.error("supabase.ts: NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Установлено" : "Отсутствует")
  console.error("supabase.ts: NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Установлено" : "Отсутствует")
  throw new Error("Missing Supabase environment variables")
} else {
  console.log("✅ supabase.ts: Переменные окружения Supabase найдены.")
}

// Define your database schema types here
// This is a simplified example, you should generate this from your Supabase project
// using `supabase gen types typescript --local > src/lib/database.types.ts`
export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          created_at: string
          roll_number: number | null
          status: "idle" | "waiting" | "active" | "completed"
          player1_id: string | null
          player2_id: string | null
          winner_id: string | null
          start_time: string | null
          end_time: string | null
          bet_amount: number | null
          nft_deposit_id: string | null
          nft_deposit_amount: number | null
          countdown_ends_at: string | null // Добавлено для таймера
        }
        Insert: {
          id?: string
          created_at?: string
          roll_number?: number | null
          status?: "idle" | "waiting" | "active" | "completed"
          player1_id?: string | null
          player2_id?: string | null
          winner_id?: string | null
          start_time?: string | null
          end_time?: string | null
          bet_amount?: number | null
          nft_deposit_id?: string | null
          nft_deposit_amount?: number | null
          countdown_ends_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          roll_number?: number | null
          status?: "idle" | "waiting" | "active" | "completed"
          player1_id?: string | null
          player2_id?: string | null
          winner_id?: string | null
          start_time?: string | null
          end_time?: string | null
          bet_amount?: number | null
          nft_deposit_id?: string | null
          nft_deposit_amount?: number | null
          countdown_ends_at?: string | null
        }
      }
      gifts: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          value: number
          created_at: string
          emoji: string | null // Добавлено для эмодзи
          base_value: number | null // Добавлено для базовой стоимости
          rarity: string | null // Добавлено для редкости
          is_nft: boolean | null // Добавлено для NFT
          nft_address: string | null // Добавлено для адреса NFT
          nft_item_id: string | null // Добавлено для ID элемента NFT
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          value: number
          created_at?: string
          emoji?: string | null
          base_value?: number | null
          rarity?: string | null
          is_nft?: boolean | null
          nft_address?: string | null
          nft_item_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          value?: number
          created_at?: string
          emoji?: string | null
          base_value?: number | null
          rarity?: string | null
          is_nft?: boolean | null
          nft_address?: string | null
          nft_item_id?: string | null
        }
      }
      players: {
        Row: {
          id: string
          telegram_id: number
          username: string
          first_name: string | null
          last_name: string | null
          photo_url: string | null
          is_premium: boolean | null
          language_code: string | null
          total_games_played: number
          total_games_won: number
          total_ton_won: number
          total_gifts_won: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: number
          username: string
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          is_premium?: boolean | null
          language_code?: string | null
          total_games_played?: number
          total_games_won?: number
          total_ton_won?: number
          total_gifts_won?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: number
          username?: string
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          is_premium?: boolean | null
          language_code?: string | null
          total_games_played?: number
          total_games_won?: number
          total_ton_won?: number
          total_gifts_won?: number
          created_at?: string
          updated_at?: string
        }
      }
      game_participants: {
        Row: {
          id: string
          game_id: string
          player_id: string
          balance: number
          gift_value: number
          color: string
          position_index: number
          chance_percentage: number | null
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          balance?: number
          gift_value?: number
          color: string
          position_index: number
          chance_percentage?: number | null
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          balance?: number
          gift_value?: number
          color?: string
          position_index?: number
          chance_percentage?: number | null
          joined_at?: string
        }
      }
      player_gifts: {
        Row: {
          id: string
          player_id: string
          gift_id: string
          quantity: number
          total_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          gift_id: string
          quantity?: number
          total_value?: number
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          gift_id?: string
          quantity?: number
          total_value?: number
          updated_at?: string
        }
      }
      game_logs: {
        Row: {
          id: string
          game_id: string
          player_id: string | null
          log_type: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id?: string | null
          log_type: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string | null
          log_type?: string
          message?: string
          created_at?: string
        }
      }
      nft_deposits: {
        Row: {
          id: string
          player_id: string
          telegram_username: string
          message_content: string | null
          nft_gifts_description: string | null
          status: string
          processed_by: string | null
          processed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          telegram_username: string
          message_content?: string | null
          nft_gifts_description?: string | null
          status?: string
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          telegram_username?: string
          message_content?: string | null
          nft_gifts_description?: string | null
          status?: string
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      game_participant_gifts: {
        Row: {
          id: string
          game_participant_id: string
          gift_id: string
          quantity: number
          value_per_gift: number
          total_value: number
        }
        Insert: {
          id?: string
          game_participant_id: string
          gift_id: string
          quantity?: number
          value_per_gift: number
          total_value: number
        }
        Update: {
          id?: string
          game_participant_id?: string
          gift_id?: string
          quantity?: number
          value_per_gift?: number
          total_value?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Initialize Supabase connection with retry logic
export const initializeSupabase = async () => {
  console.log("supabase.ts: initializeSupabase вызван.")
  const MAX_RETRIES = 3
  const RETRY_DELAY = 2000 // 2 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 supabase.ts: Попытка подключения к Supabase (попытка ${attempt}/${MAX_RETRIES})...`)

      // Test the connection with a simple query
      const { data, error } = await supabase.from("games").select("id").limit(1)

      if (error) throw error

      console.log("✅ supabase.ts: Клиент Supabase инициализирован для PvP Wheel")
      return true
    } catch (err) {
      console.error(`❌ supabase.ts: Не удалось подключиться (попытка ${attempt}/${MAX_RETRIES}):`, err)

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ supabase.ts: Повторная попытка через ${RETRY_DELAY / 1000} секунд...`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      } else {
        console.error("❌ supabase.ts: Все попытки подключения не удались")
        return false
      }
    }
  }
  return false
}

// Helper functions for database operations
export const dbHelpers = {
  // Test database connection
  async testConnection() {
    console.log("dbHelpers: testConnection вызван.")
    try {
      console.log("dbHelpers: Тестирование подключения к базе данных...")
      const { data, error } = await supabase.from("games").select("count").limit(1)

      if (error) {
        console.error("dbHelpers: Тест подключения к базе данных не удался:", error)
        return { success: false, error }
      }

      console.log("dbHelpers: Тест подключения к базе данных успешен")
      return { success: true, data }
    } catch (err) {
      console.error("dbHelpers: Ошибка теста подключения к базе данных:", err)
      return { success: false, error: err }
    }
  },

  // Players
  async getOrCreatePlayer(telegramUser: {
    id: number
    username?: string
    first_name?: string
    last_name?: string
    photo_url?: string
    is_premium?: boolean
    language_code?: string
  }) {
    console.log("dbHelpers: getOrCreatePlayer вызван для telegram_id:", telegramUser.id)
    try {
      let { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("telegram_id", telegramUser.id)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 means no rows found
        console.error("dbHelpers: Ошибка при получении игрока:", error)
        throw error
      }

      if (!player) {
        console.log("dbHelpers: Игрок не найден, создание нового игрока.")
        const { data: newPlayer, error: insertError } = await supabase
          .from("players")
          .insert({
            telegram_id: telegramUser.id,
            username: telegramUser.username || `user_${telegramUser.id}`,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            photo_url: telegramUser.photo_url,
            is_premium: telegramUser.is_premium,
            language_code: telegramUser.language_code,
          })
          .select()
          .single()

        if (insertError) {
          console.error("dbHelpers: Ошибка при вставке нового игрока:", insertError)
          throw insertError
        }
        player = newPlayer
        console.log("dbHelpers: Новый игрок успешно создан:", player)
      } else {
        console.log("dbHelpers: Существующий игрок найден:", player)
      }
      return { data: player, error: null }
    } catch (err) {
      console.error("dbHelpers: Ошибка в getOrCreatePlayer:", err)
      return { data: null, error: err }
    }
  },

  // Games
  async getCurrentGame() {
    console.log("dbHelpers: getCurrentGame вызван.")
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        game_participants (
          *,
          players (*),
          game_participant_gifts (
            quantity,
            gifts (
              emoji,
              name,
              base_value
            )
          )
        )
      `)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)

    return { data: data?.[0] || null, error }
  },

  async createGame(rollNumber: number) {
    console.log("dbHelpers: createGame вызван с rollNumber:", rollNumber)
    // Set countdown to end 60 seconds from now when first participant joins
    const { data, error } = await supabase
      .from("games")
      .insert({
        roll_number: rollNumber,
        status: "waiting",
      })
      .select()
      .single()

    return { data, error }
  },

  async startGameCountdown(gameId: string, durationSeconds = 60) {
    console.log("dbHelpers: startGameCountdown вызван для gameId:", gameId)
    const countdownEndsAt = new Date(Date.now() + durationSeconds * 1000).toISOString()

    const { data, error } = await supabase
      .from("games")
      .update({ countdown_ends_at: countdownEndsAt })
      .eq("id", gameId)
      .select()
      .single()

    return { data, error }
  },

  async getGameCountdown(gameId: string) {
    console.log("dbHelpers: getGameCountdown вызван для gameId:", gameId)
    const { data, error } = await supabase.from("games").select("countdown_ends_at").eq("id", gameId).single()

    if (error || !data?.countdown_ends_at) {
      return { timeLeft: null, error }
    }

    const now = new Date()
    const endsAt = new Date(data.countdown_ends_at)
    const timeLeft = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000))

    return { timeLeft, error: null }
  },

  async updateGameStatus(gameId: string, status: string, updates: any = {}) {
    console.log("dbHelpers: updateGameStatus вызван для gameId:", gameId, "status:", status)
    const { data, error } = await supabase
      .from("games")
      .update({ status, ...updates })
      .eq("id", gameId)
      .select()
      .single()

    return { data, error }
  },

  // Game Participants
  async joinGame(gameId: string, playerId: string, giftSelections: any[], color: string, positionIndex: number) {
    console.log("dbHelpers: joinGame вызван для gameId:", gameId, "playerId:", playerId)
    const totalGiftValue = giftSelections.reduce((sum, selection) => sum + selection.totalValue, 0)

    const { data, error } = await supabase
      .from("game_participants")
      .insert({
        game_id: gameId,
        player_id: playerId,
        balance: 0,
        gift_value: totalGiftValue,
        color,
        position_index: positionIndex,
      })
      .select()
      .single()

    return { data, error }
  },

  // Gifts
  async getAllGifts() {
    console.log("dbHelpers: getAllGifts вызван.")
    const { data, error } = await supabase.from("gifts").select("*").order("value", { ascending: true })

    return { data, error }
  },

  async getPlayerGifts(playerId: string) {
    console.log("dbHelpers: getPlayerGifts вызван для playerId:", playerId)
    const { data, error } = await supabase
      .from("player_gifts")
      .select(`
        *,
        gifts (*)
      `)
      .eq("player_id", playerId)
      .gt("quantity", 0)

    return { data, error }
  },

  async updatePlayerGifts(playerId: string, giftId: string, quantityChange: number) {
    console.log(
      "dbHelpers: updatePlayerGifts вызван для playerId:",
      playerId,
      "giftId:",
      giftId,
      "quantityChange:",
      quantityChange,
    )
    // First, try to get existing record
    const { data: existing } = await supabase
      .from("player_gifts")
      .select("*")
      .eq("player_id", playerId)
      .eq("gift_id", giftId)
      .single()

    if (existing) {
      // Update existing record
      const newQuantity = existing.quantity + quantityChange
      const { data, error } = await supabase
        .from("player_gifts")
        .update({ quantity: newQuantity })
        .eq("id", existing.id)
        .select()
        .single()

      return { data, error }
    } else if (quantityChange > 0) {
      // Create new record
      const { data, error } = await supabase
        .from("player_gifts")
        .insert({
          player_id: playerId,
          gift_id: giftId,
          quantity: quantityChange,
          total_value: 0, // Will be calculated by trigger
        })
        .select()
        .single()

      return { data, error }
    }

    return { data: null, error: null }
  },

  // Game Logs
  async addGameLog(gameId: string, playerId: string | null, logType: string, message: string) {
    console.log("dbHelpers: addGameLog вызван для gameId:", gameId, "logType:", logType)
    const { data, error } = await supabase
      .from("game_logs")
      .insert({
        game_id: gameId,
        player_id: playerId,
        log_type: logType,
        message,
      })
      .select()
      .single()

    return { data, error }
  },

  async getGameLogs(gameId: string, limit = 20) {
    console.log("dbHelpers: getGameLogs вызван для gameId:", gameId)
    const { data, error } = await supabase
      .from("game_logs")
      .select(`
        *,
        players (username, first_name)
      `)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(limit)

    return { data, error }
  },

  // Match History
  async getMatchHistory(limit = 50) {
    console.log("dbHelpers: getMatchHistory вызван.")
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        players!games_winner_id_fkey (username, first_name),
        game_participants (
          *,
          players (username, first_name)
        )
      `)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit)

    return { data, error }
  },

  // Get game participants with related data
  async getGameParticipants(gameId: string) {
    console.log("dbHelpers: getGameParticipants вызван для gameId:", gameId)
    try {
      const { data, error } = await supabase
        .from("game_participants")
        .select(`
          *,
          players:player_id (*),
          game_participant_gifts(
            *,
            gifts:gift_id (*)
          )
        `)
        .eq("game_id", gameId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("dbHelpers: Ошибка получения участников игры:", error)
        return { error }
      }

      return { data }
    } catch (error) {
      console.error("dbHelpers: Ошибка в getGameParticipants:", error)
      return { error }
    }
  },
}

export default supabase
