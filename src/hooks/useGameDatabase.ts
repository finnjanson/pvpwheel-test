"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/supabase-auth-helpers/nextjs"
import type { Database } from "@/lib/supabase" // Assuming you have a types file for Supabase
import type { RealtimeChannel } from "@supabase/supabase-js"
import { dbHelpers } from "../lib/supabase"

console.log("useGameDatabase.ts: Хук useGameDatabase загружен.")

// Define types for Game and Gift
interface Game {
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
}

interface Gift {
  id: string
  name: string
  description: string
  image_url: string
  value: number
  created_at: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface Player {
  id: string
  name: string
  balance: number
  color: string
  gifts: string[]
  giftValue: number
  telegramUser?: TelegramUser
}

interface GameLog {
  id: string
  message: string
  timestamp: Date
  type: "join" | "spin" | "winner" | "info"
}

interface MatchHistoryEntry {
  id: string
  rollNumber: number
  timestamp: Date
  players: Player[]
  winner: Player
  totalPot: number
  winnerChance: number
}

interface GameParticipant {
  id: string
  game_id: string
  user_id: string
  balance: number
  created_at: string
}

interface ConnectionTestResult {
  success: boolean
  error?: Error | string | null
}

export const useGameDatabase = () => {
  console.log("useGameDatabase.ts: Инициализация хука useGameDatabase.")
  const supabase = createClientComponentClient<Database>()
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [dbPlayers, setDbPlayers] = useState<any[]>([])
  const [dbGameLogs, setDbGameLogs] = useState<GameLog[]>([])
  const [dbMatchHistory, setDbMatchHistory] = useState<MatchHistoryEntry[]>([])
  const [playerInventory, setPlayerInventory] = useState<any[]>([])
  const [availableGifts, setAvailableGifts] = useState<any[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [gameCountdown, setGameCountdown] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [isLoadingGame, setIsLoadingGame] = useState(true)
  const [errorGame, setErrorGame] = useState<Error | null>(null)

  // State for managing subscriptions
  const [globalSubscription, setGlobalSubscription] = useState<RealtimeChannel | null>(null)
  const [gameSubscription, setGameSubscription] = useState<RealtimeChannel | null>(null)

  // Initialize player from Telegram data
  const initializePlayer = useCallback(async (telegramUser: TelegramUser) => {
    console.log("useGameDatabase.ts: initializePlayer вызван.")
    try {
      setLoading(true)

      // First check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("useGameDatabase.ts: Переменные окружения Supabase не настроены.")
        setError("Database not configured. Please check environment variables.")
        return null
      }

      console.log("useGameDatabase.ts: Попытка инициализировать игрока:", telegramUser.id, telegramUser.username)

      const { data: player, error } = await dbHelpers.getOrCreatePlayer(telegramUser)

      if (error) {
        console.error("useGameDatabase.ts: Ошибка создания игрока:", error)
        console.error("useGameDatabase.ts: Детали ошибки:", {
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        })
        setError(`Failed to initialize player: ${(error as any).message}`)
        return null
      }

      console.log("useGameDatabase.ts: Игрок успешно инициализирован:", player)
      setCurrentPlayer(player)
      return player
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка инициализации игрока:", err)
      setError("Failed to initialize player")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Load available gifts
  const loadAvailableGifts = useCallback(async () => {
    console.log("useGameDatabase.ts: loadAvailableGifts вызван.")
    try {
      const { data: gifts, error } = await dbHelpers.getAllGifts()

      if (error) {
        console.error("useGameDatabase.ts: Ошибка загрузки подарков:", error)
        return
      }

      setAvailableGifts(gifts || [])
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка загрузки подарков:", err)
    }
  }, [])

  // Load player inventory
  const loadPlayerInventory = useCallback(async (playerId: string) => {
    console.log("useGameDatabase.ts: loadPlayerInventory вызван для игрока:", playerId)
    try {
      const { data: inventory, error } = await dbHelpers.getPlayerGifts(playerId)

      if (error) {
        console.error("useGameDatabase.ts: Ошибка загрузки инвентаря игрока:", error)
        return
      }

      setPlayerInventory(inventory || [])
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка загрузки инвентаря игрока:", err)
    }
  }, [])

  // Participant subscription setup
  const setupParticipantSubscription = async (gameId: string) => {
    console.log("useGameDatabase.ts: setupParticipantSubscription вызван для игры:", gameId)
    const participantSubscription = supabase
      .channel(`game_participants_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_participants",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("useGameDatabase.ts: Состояние участника изменилось:", payload)
          try {
            // Force refresh participants on any change
            await loadGameParticipants(gameId)
            // Also refresh game state in case it was affected
            await getCurrentGame()
          } catch (err) {
            console.error("useGameDatabase.ts: Ошибка обработки изменения участника:", err)
          }
        },
      )
      .subscribe((status) => {
        console.log(`useGameDatabase.ts: Статус подписки участника для игры ${gameId}:`, status)
      })

    return participantSubscription
  }

  // Type-safe game helper functions
  const getFreshGames = async (): Promise<Game[]> => {
    console.log("useGameDatabase.ts: getFreshGames вызван.")
    try {
      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error
      return games || []
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка получения свежих игр:", err)
      return []
    }
  }

  const getCurrentGame = async (): Promise<Game | null> => {
    console.log("useGameDatabase.ts: getCurrentGame (внутренний) вызван.")
    if (!currentGameId) return null
    try {
      const { data: game, error } = await supabase.from("games").select("*").eq("id", currentGameId).single()

      if (error) throw error
      return game
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка получения текущей игры (внутренний):", err)
      return null
    }
  }

  // Get fresh games data with caching
  const getFreshGamesData = async () => {
    console.log("useGameDatabase.ts: getFreshGamesData вызван.")
    try {
      const cacheKey = "current_games"
      const cacheTime = 2000 // 2 seconds cache

      // Check memory cache first
      const cachedData = (window as any).__gamesCache?.[cacheKey]
      const now = Date.now()
      if (cachedData && now - cachedData.timestamp < cacheTime) {
        console.log("useGameDatabase.ts: Данные игр получены из кэша.")
        return cachedData.data
      }

      // If no cache or expired, fetch fresh data
      const { data: games, error } = await supabase
        .from("games")
        .select(`
      *,
      game_participants (
        id,
        player_id,
        balance,
        color,
        position_index,
        players (
          id,
          username,
          first_name
        )
      )
    `)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })

      if (error) {
        console.error("useGameDatabase.ts: Ошибка получения свежих игр:", error)
        return []
      }

      // Update cache
      if (!(window as any).__gamesCache) {
        ;(window as any).__gamesCache = {}
      }
      ;(window as any).__gamesCache[cacheKey] = {
        data: games,
        timestamp: now,
      }
      console.log("useGameDatabase.ts: Свежие данные игр получены и закэшированы.")
      return games
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка в getFreshGames:", err)
      return []
    }
  }

  // Get or create current game
  const getCurrentGameData = useCallback(async (rollNumber: number) => {
    console.log("useGameDatabase.ts: getCurrentGameData (публичный) вызван с rollNumber:", rollNumber)
    try {
      console.log(
        "🎯 useGameDatabase.ts: Загрузка текущей игры...",
        rollNumber > 0 ? `Roll #${rollNumber}` : "Существующая игра",
      )
      setLoading(true)
      setIsLoadingGame(true) // Устанавливаем isLoadingGame в true в начале

      // First, try to get current waiting game
      const { data: currentGame, error: fetchError } = await dbHelpers.getCurrentGame()

      if (fetchError) {
        console.error("❌ useGameDatabase.ts: Ошибка получения текущей игры:", fetchError)
        setError("Failed to load current game")
        setErrorGame(fetchError as Error) // Устанавливаем errorGame
        return null
      }

      if (currentGame) {
        console.log(
          "✅ useGameDatabase.ts: Найдена существующая игра:",
          currentGame.roll_number,
          "с",
          currentGame.game_participants?.length || 0,
          "игроками",
        )
        setCurrentGameId(currentGame.id)
        setCurrentGame(currentGame) // Устанавливаем currentGame

        // Load participants for this game
        const participants = currentGame.game_participants || []

        // Transform participants to match Player interface
        const transformedPlayers = participants.map((participant: any) => {
          // Build gifts array from game_participant_gifts
          const gifts: string[] = []
          if (participant.game_participant_gifts) {
            participant.game_participant_gifts.forEach((giftEntry: any) => {
              const emoji = giftEntry.gifts?.emoji || "🎁"
              for (let i = 0; i < giftEntry.quantity; i++) {
                gifts.push(emoji)
              }
            })
          }

          return {
            id: participant.id,
            name: participant.players?.username || participant.players?.first_name || "Unknown",
            balance: participant.balance || 0,
            color: participant.color,
            gifts: gifts,
            giftValue: participant.gift_value || 0,
            telegramUser: participant.players,
          }
        })

        setDbPlayers(transformedPlayers)

        // Check if there's an existing countdown for this game
        const { timeLeft } = await dbHelpers.getGameCountdown(currentGame.id)
        if (timeLeft !== null && timeLeft > 0) {
          console.log("✅ useGameDatabase.ts: Найден существующий обратный отсчет:", timeLeft, "секунд осталось")
          setGameCountdown(timeLeft)
        } else {
          console.log("ℹ️ useGameDatabase.ts: Нет активного обратного отсчета для этой игры")
          setGameCountdown(null)
        }

        return currentGame
      }

      // If no current game, create a new one ONLY if we have a valid roll number
      // This prevents creating multiple games unnecessarily
      if (rollNumber && rollNumber > 0) {
        console.log("🆕 useGameDatabase.ts: Создание новой игры для Roll #" + rollNumber)
        const { data: newGame, error: createError } = await dbHelpers.createGame(rollNumber)

        if (createError) {
          console.error("❌ useGameDatabase.ts: Ошибка создания новой игры:", createError)
          setError("Failed to create new game")
          setErrorGame(createError as Error) // Устанавливаем errorGame
          return null
        }

        console.log("✅ useGameDatabase.ts: Создана новая игра:", newGame.id)
        setCurrentGameId(newGame.id)
        setCurrentGame(newGame) // Устанавливаем currentGame
        setDbPlayers([]) // Empty players for new game
        setGameCountdown(null) // Reset countdown for new game
        return newGame
      } else {
        console.log("ℹ️ useGameDatabase.ts: Текущая игра не найдена и rollNumber не предоставлен для создания новой.")
        setCurrentGame(null) // Устанавливаем currentGame в null
        return null
      }
    } catch (err) {
      console.error("❌ useGameDatabase.ts: Ошибка получения текущей игры:", err)
      setError("Failed to get current game")
      setErrorGame(err as Error) // Устанавливаем errorGame
      return null
    } finally {
      setLoading(false)
      setIsLoadingGame(false) // Устанавливаем isLoadingGame в false в конце
    }
  }, [])

  // Join game with gifts
  const joinGameWithGifts = useCallback(
    async (
      gameId: string,
      playerId: string,
      giftSelections: { giftId: string; quantity: number; totalValue: number }[],
      color: string,
      positionIndex: number,
    ) => {
      console.log("useGameDatabase.ts: joinGameWithGifts вызван.")
      try {
        setLoading(true)

        console.log("useGameDatabase.ts: Присоединение к игре с подарками:", {
          gameId,
          playerId,
          giftSelections,
          color,
          positionIndex,
        })

        // Validate inputs
        if (!gameId || !playerId || !giftSelections || giftSelections.length === 0) {
          throw new Error("Invalid parameters for joining game")
        }

        // Join the game
        const { data: participant, error: joinError } = await dbHelpers.joinGame(
          gameId,
          playerId,
          giftSelections,
          color,
          positionIndex,
        )

        if (joinError) {
          console.error("useGameDatabase.ts: Ошибка присоединения к игре:", joinError)
          console.error("useGameDatabase.ts: Детали ошибки присоединения:", {
            message: joinError.message,
            details: joinError.details,
            hint: joinError.hint,
            code: joinError.code,
          })
          const errorMessage = joinError.message || "Unknown database error"
          setError(`Failed to join game: ${errorMessage}`)
          return null
        }

        console.log("useGameDatabase.ts: Успешно присоединился к игре:", participant)

        // Update player inventory (reduce gift quantities)
        for (const selection of giftSelections) {
          try {
            await dbHelpers.updatePlayerGifts(playerId, selection.giftId, -selection.quantity)
          } catch (inventoryError) {
            console.error("useGameDatabase.ts: Ошибка обновления подарков игрока:", inventoryError)
            // Continue with other gifts even if one fails
          }
        }

        // Reload player inventory
        await loadPlayerInventory(playerId)

        return participant
      } catch (err) {
        console.error("useGameDatabase.ts: Ошибка присоединения к игре с подарками:", err)
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(`Failed to join game: ${errorMessage}`)
        return null
      } finally {
        setLoading(false)
      }
    },
    [loadPlayerInventory],
  )

  // Load game participants
  const loadGameParticipants = useCallback(async (gameId: string) => {
    console.log("useGameDatabase.ts: loadGameParticipants вызван для игры:", gameId)
    try {
      console.log("useGameDatabase.ts: Загрузка участников для игры:", gameId)

      const { data: participants, error } = await supabase
        .from("game_participants")
        .select(`
       *,
       players (
         id,
         username,
         first_name,
         last_name,
         photo_url,
         is_premium
       ),
       game_participant_gifts (
         quantity,
         gifts (
           emoji,
           name,
           base_value
         )
       )
     `)
        .eq("game_id", gameId)
        .order("position_index")

      if (error) {
        console.error("useGameDatabase.ts: Ошибка загрузки участников игры:", error)
        return []
      }

      console.log("useGameDatabase.ts: Загруженные участники:", participants)

      // Transform to match the Player interface
      const transformedPlayers = (participants || []).map((participant: any) => {
        // Build gifts array from game_participant_gifts
        const gifts: string[] = []
        if (participant.game_participant_gifts) {
          participant.game_participant_gifts.forEach((giftEntry: any) => {
            const emoji = giftEntry.gifts?.emoji || "🎁"
            for (let i = 0; i < giftEntry.quantity; i++) {
              gifts.push(emoji)
            }
          })
        }

        return {
          id: participant.id,
          name: participant.players?.username || participant.players?.first_name || "Unknown",
          balance: participant.balance || 0,
          color: participant.color,
          gifts: gifts,
          giftValue: participant.gift_value || 0,
          telegramUser: participant.players
            ? {
                id: participant.players.id,
                first_name: participant.players.first_name,
                last_name: participant.players.last_name,
                username: participant.players.username,
                photo_url: participant.players.photo_url,
                is_premium: participant.players.is_premium,
              }
            : undefined,
        }
      })

      setDbPlayers(transformedPlayers)
      return transformedPlayers
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка загрузки участников игры:", err)
      return []
    }
  }, [])
  const completeGame = useCallback(
    async (gameId: string, winnerId: string, winnerChance: number, totalGiftValue: number) => {
      console.log("useGameDatabase.ts: completeGame вызван.")
      try {
        setLoading(true)

        // Update game status to completed
        const { data: completedGame, error } = await dbHelpers.updateGameStatus(gameId, "completed", {
          winner_id: winnerId,
          winner_chance: winnerChance,
          total_gift_value: totalGiftValue,
          completed_at: new Date().toISOString(),
        })

        if (error) {
          console.error("useGameDatabase.ts: Ошибка завершения игры:", error)
          setError("Failed to complete game")
          return null
        }

        // Award gifts to winner
        // This would typically involve adding gifts to winner's inventory
        // For now, we'll just log it
        await dbHelpers.addGameLog(gameId, winnerId, "winner", `Won ${totalGiftValue.toFixed(3)} TON in gifts!`)

        return completedGame
      } catch (err) {
        console.error("useGameDatabase.ts: Ошибка завершения игры:", err)
        setError("Failed to complete game")
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // Add game log
  const addGameLog = useCallback(
    async (gameId: string, playerId: string | null, logType: "join" | "spin" | "winner" | "info", message: string) => {
      console.log("useGameDatabase.ts: addGameLog вызван.")
      try {
        await dbHelpers.addGameLog(gameId, playerId, logType, message)
      } catch (err) {
        console.error("useGameDatabase.ts: Ошибка добавления лога игры:", err)
      }
    },
    [],
  )

  // Load game logs
  const loadGameLogs = useCallback(async (gameId: string) => {
    console.log("useGameDatabase.ts: loadGameLogs вызван для игры:", gameId)
    try {
      const { data: logs, error } = await dbHelpers.getGameLogs(gameId)

      if (error) {
        console.error("useGameDatabase.ts: Ошибка загрузки логов игры:", error)
        return
      }

      const formattedLogs: GameLog[] = (logs || []).map((log) => ({
        id: log.id,
        message: log.message,
        timestamp: new Date(log.created_at),
        type: log.log_type as any,
      }))

      setDbGameLogs(formattedLogs)
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка загрузки логов игры:", err)
    }
  }, [])

  // Load match history
  const loadMatchHistory = useCallback(async () => {
    console.log("useGameDatabase.ts: loadMatchHistory вызван.")
    try {
      const { data: history, error } = await dbHelpers.getMatchHistory()

      if (error) {
        console.error("useGameDatabase.ts: Ошибка загрузки истории матчей:", error)
        return
      }

      // Transform database format to component format
      const formattedHistory: MatchHistoryEntry[] = (history || []).map((game) => ({
        id: game.id,
        rollNumber: game.roll_number,
        timestamp: new Date(game.completed_at || game.created_at),
        players:
          game.game_participants?.map((p: any) => ({
            id: p.player_id,
            name: p.players?.username || p.players?.first_name || "Unknown",
            balance: p.balance,
            color: p.color,
            gifts: [], // Would need to load from game_participant_gifts
            giftValue: p.gift_value,
            telegramUser: undefined,
          })) || [],
        winner: {
          id: game.winner_id || "",
          name: game.players?.username || game.players?.first_name || "Unknown",
          balance: 0,
          color: "#000000",
          gifts: [],
          giftValue: 0,
          telegramUser: undefined,
        },
        totalPot: game.total_gift_value || 0,
        winnerChance: game.winner_chance || 0,
      }))

      setDbMatchHistory(formattedHistory)
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка загрузки истории матчей:", err)
    }
  }, [])

  // Error handling and retry utilities
  const INITIAL_RETRY_DELAY = 1000 // 1 second
  const MAX_RETRY_DELAY = 10000 // 10 seconds
  const MAX_RETRIES = 5

  const withRetry = async (operation: () => Promise<any>, context: string) => {
    console.log(`useGameDatabase.ts: withRetry вызван для ${context}.`)
    let retryCount = 0
    let delay = INITIAL_RETRY_DELAY

    while (retryCount < MAX_RETRIES) {
      try {
        return await operation()
      } catch (err) {
        console.error(`useGameDatabase.ts: Ошибка в ${context} (попытка ${retryCount + 1}/${MAX_RETRIES}):`, err)
        retryCount++

        if (retryCount === MAX_RETRIES) {
          throw new Error(`Failed ${context} after ${MAX_RETRIES} attempts`)
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, MAX_RETRY_DELAY)
      }
    }
  }

  // Enhanced subscription setup with state management
  const setupSubscriptions = async () => {
    console.log("useGameDatabase.ts: setupSubscriptions вызван.")
    await withRetry(async () => {
      // Clean up existing subscriptions
      if (globalSubscription) {
        console.log("useGameDatabase.ts: Отписка от существующей глобальной подписки.")
        await supabase.removeChannel(globalSubscription)
      }
      if (gameSubscription) {
        console.log("useGameDatabase.ts: Отписка от существующей игровой подписки.")
        await supabase.removeChannel(gameSubscription)
      }

      // Global subscription for all waiting games
      const newGlobalSub = supabase
        .channel("global_games")
        .on("postgres_changes", { event: "*", schema: "public", table: "games" }, async (payload) => {
          console.log("useGameDatabase.ts: Глобальное состояние игры изменилось:", payload)
          await withRetry(async () => {
            const freshGames = await getFreshGames()
            if (freshGames?.length > 0) {
              const latestGame = freshGames[0]
              console.log("useGameDatabase.ts: Обновление до последней игры:", latestGame.id)
              setCurrentGameId(latestGame.id)
              await loadGameParticipants(latestGame.id)
            }
          }, "refresh game state")
        })
        .subscribe((status) => {
          console.log("useGameDatabase.ts: Статус глобальной подписки на игру:", status)
        })

      setGlobalSubscription(newGlobalSub)

      // Set up participant subscription if we have a current game
      if (currentGameId) {
        const newGameSub = await setupParticipantSubscription(currentGameId)
        setGameSubscription(newGameSub)
      }

      // Cleanup function
      return () => {
        console.log("useGameDatabase.ts: Очистка подписок")
        if (globalSubscription) {
          supabase.removeChannel(globalSubscription)
        }
        if (gameSubscription) {
          supabase.removeChannel(gameSubscription)
        }
        setGlobalSubscription(null)
        setGameSubscription(null)
      }
    }, "subscription setup")
  }

  // Cache management
  const cache = new Map<string, { data: any; timestamp: number }>()
  const CACHE_TTL = 5000 // 5 seconds

  const withCache = async (key: string, operation: () => Promise<any>) => {
    console.log(`useGameDatabase.ts: withCache вызван для ключа: ${key}.`)
    const now = Date.now()
    const cached = cache.get(key)

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    const data = await operation()
    cache.set(key, { data, timestamp: now })
    return data
  }

  // Initialize data on mount
  useEffect(() => {
    let mounted = true
    const initTimeout = setTimeout(() => {
      if (mounted && !error) {
        console.error("useGameDatabase.ts: Инициализация базы данных истекла по таймауту.")
        setError("Database connection timed out. Please refresh the page.")
        setLoading(false)
        setIsLoadingGame(false) // Устанавливаем isLoadingGame в false при таймауте
      }
    }, 15000) // 15 second timeout

    // Dummy Supabase initialization function (replace with real logic if needed)
    const initializeSupabase = async (): Promise<boolean> => {
      console.log("useGameDatabase.ts: initializeSupabase (внутренний) вызван.")
      // If you have custom initialization logic, add it here.
      // For now, just check if supabase is defined.
      if (supabase) return true
      return false
    }

    const initializeData = async () => {
      try {
        if (!mounted) return

        console.log("🎮 useGameDatabase.ts: Инициализация базы данных PvP Wheel...")
        setLoading(true)
        setIsLoadingGame(true) // Устанавливаем isLoadingGame в true

        // Initialize Supabase first
        const initialized = await initializeSupabase()
        if (!initialized) {
          throw new Error("Failed to initialize database connection")
        }

        if (!mounted) return

        console.log("✅ useGameDatabase.ts: База данных подключена, загрузка игровых данных...")

        // Load initial data in parallel
        await Promise.all([
          loadAvailableGifts().catch((err) => {
            console.error("useGameDatabase.ts: Не удалось загрузить подарки:", err)
            return null
          }),
          loadMatchHistory().catch((err) => {
            console.error("useGameDatabase.ts: Не удалось загрузить историю матчей:", err)
            return null
          }),
        ])

        if (!mounted) return

        console.log("✅ useGameDatabase.ts: Игровые данные успешно загружены")
        clearTimeout(initTimeout)
        setLoading(false)
        setIsLoadingGame(false) // Устанавливаем isLoadingGame в false
      } catch (err) {
        if (!mounted) return

        console.error("❌ useGameDatabase.ts: Ошибка во время инициализации данных:", err)
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(`Failed to initialize application data: ${errorMessage}`)
        setLoading(false)
        setIsLoadingGame(false) // Устанавливаем isLoadingGame в false при ошибке
      }
    }

    initializeData()

    return () => {
      mounted = false
      clearTimeout(initTimeout)
    }
  }, [loadAvailableGifts, loadMatchHistory])

  // Load player inventory when current player changes
  useEffect(() => {
    console.log("useGameDatabase.ts: Эффект загрузки инвентаря игрока: currentPlayer изменился.")
    if (currentPlayer?.id) {
      loadPlayerInventory(currentPlayer.id)
    }
  }, [currentPlayer, loadPlayerInventory])

  // Load game logs when current game changes
  useEffect(() => {
    console.log("useGameDatabase.ts: Эффект загрузки логов игры: currentGameId изменился.")
    if (currentGameId) {
      loadGameLogs(currentGameId)
    }
  }, [currentGameId, loadGameLogs])

  // Real-time subscriptions and polling setup
  useEffect(() => {
    console.log("useGameDatabase.ts: Настройка подписок в реальном времени и опроса...")
    let retryCount = 0
    const MAX_RETRIES = 5
    const RETRY_DELAY = 2000 // 2 seconds
    const POLL_INTERVAL = 3000 // 3 seconds
    let pollInterval: NodeJS.Timeout | null = null

    const pollForUpdates = async () => {
      try {
        const freshGames = await getFreshGames()
        if (freshGames?.length > 0) {
          const latestGame = freshGames[0]
          if (latestGame.id !== currentGameId) {
            console.log("useGameDatabase.ts: Опрос обнаружил новую игру:", latestGame.id)
            setCurrentGameId(latestGame.id)
            await loadGameParticipants(latestGame.id)
          } else if (currentGameId) {
            // Even if game ID hasn't changed, refresh participants
            await loadGameParticipants(currentGameId)
          }
        }
      } catch (err) {
        console.error("useGameDatabase.ts: Ошибка при обновлении опроса:", err)
      }
    }

    const setupSubscriptions = async () => {
      try {
        // Global subscription for all waiting games
        const globalGameSubscription = supabase
          .channel("global_games")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "games",
            },
            async (payload) => {
              console.log("useGameDatabase.ts: Глобальное состояние игры изменилось:", payload)
              try {
                // Force immediate refresh regardless of change type
                const freshGames = await getFreshGames()
                if (freshGames?.length > 0) {
                  const latestGame = freshGames[0]
                  console.log("useGameDatabase.ts: Обновление до последней игры:", latestGame.id)
                  setCurrentGameId(latestGame.id)
                  await loadGameParticipants(latestGame.id)
                }
              } catch (err) {
                console.error("useGameDatabase.ts: Ошибка обработки изменения состояния игры:", err)
                if (retryCount < MAX_RETRIES) {
                  retryCount++
                  setTimeout(setupSubscriptions, RETRY_DELAY)
                }
              }
            },
          )
          .subscribe((status) => {
            console.log("useGameDatabase.ts: Статус глобальной подписки на игру:", status)
            if (status === "SUBSCRIBED") {
              retryCount = 0
              // Start polling when subscription is active
              if (!pollInterval) {
                pollInterval = setInterval(pollForUpdates, POLL_INTERVAL)
              }
            } else if (status === "CHANNEL_ERROR" && retryCount < MAX_RETRIES) {
              retryCount++
              setTimeout(setupSubscriptions, RETRY_DELAY * retryCount)
            }
          })

        // Enhanced game-specific subscription
        let gameSubscription: any = null
        if (currentGameId) {
          gameSubscription = supabase
            .channel(`game_${currentGameId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "games",
                filter: `id=eq.${currentGameId}`,
              },
              async (payload) => {
                console.log("useGameDatabase.ts: Состояние игры изменилось:", payload)
                // Force immediate refresh of game state
                const freshGames = await getFreshGames()
                const currentGame = freshGames.find((g) => g.id === currentGameId)
                if (currentGame) {
                  await loadGameParticipants(currentGame.id)

                  // Check for countdown updates
                  const { timeLeft } = await dbHelpers.getGameCountdown(currentGame.id)
                  if (timeLeft !== null) {
                    console.log(
                      "useGameDatabase.ts: Обновление обратного отсчета в реальном времени:",
                      timeLeft,
                      "секунд осталось",
                    )
                    setGameCountdown(timeLeft)
                  }
                }
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "game_participants",
                filter: `game_id=eq.${currentGameId}`,
              },
              async () => {
                // Immediate participant reload
                await loadGameParticipants(currentGameId)
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "game_logs",
                filter: `game_id=eq.${currentGameId}`,
              },
              async () => {
                await loadGameLogs(currentGameId)
              },
            )
            .subscribe((status) => {
              console.log("useGameDatabase.ts: Статус подписки на конкретную игру:", status)
              if (status === "CHANNEL_ERROR") {
                // Attempt immediate reconnection
                gameSubscription?.unsubscribe()
                setupSubscriptions()
              }
            })
        }

        return () => {
          console.log("useGameDatabase.ts: Очистка подписок в реальном времени и опроса")
          if (pollInterval) {
            clearInterval(pollInterval)
          }
          supabase.removeChannel(globalGameSubscription)
          if (gameSubscription) {
            supabase.removeChannel(gameSubscription)
          }
        }
      } catch (err) {
        console.error("useGameDatabase.ts: Ошибка в настройке подписки:", err)
        if (retryCount < MAX_RETRIES) {
          retryCount++
          setTimeout(setupSubscriptions, RETRY_DELAY * retryCount)
        }
      }
    }

    // Initial setup
    setupSubscriptions()
  }, [currentGameId, loadGameLogs, loadGameParticipants, getCurrentGame])

  // Countdown management
  const startGameCountdown = useCallback(async (gameId: string) => {
    console.log("useGameDatabase.ts: startGameCountdown вызван для игры:", gameId)
    try {
      console.log("useGameDatabase.ts: Запуск обратного отсчета для игры:", gameId)
      const { data, error } = await dbHelpers.startGameCountdown(gameId, 60)

      if (error) {
        console.error("useGameDatabase.ts: Ошибка запуска обратного отсчета:", error)
        return false
      }

      console.log("useGameDatabase.ts: Обратный отсчет успешно запущен")
      return true
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка запуска обратного отсчета:", err)
      return false
    }
  }, [])

  const getGameCountdown = useCallback(async (gameId: string) => {
    console.log("useGameDatabase.ts: getGameCountdown вызван для игры:", gameId)
    try {
      const { timeLeft, error } = await dbHelpers.getGameCountdown(gameId)

      if (error) {
        console.error("useGameDatabase.ts: Ошибка получения обратного отсчета:", error)
        return null
      }

      setGameCountdown(timeLeft)
      return timeLeft
    } catch (err) {
      console.error("useGameDatabase.ts: Ошибка получения обратного отсчета:", err)
      return null
    }
  }, [])

  // Auto-start countdown when game reaches 2 players
  useEffect(() => {
    console.log(
      "useGameDatabase.ts: Эффект автозапуска обратного отсчета: currentGameId",
      currentGameId,
      "dbPlayers.length",
      dbPlayers.length,
    )
    if (currentGameId && dbPlayers.length === 2) {
      // Check if countdown is already running
      const checkAndStartCountdown = async () => {
        const { timeLeft } = await dbHelpers.getGameCountdown(currentGameId)
        if (timeLeft === null || timeLeft <= 0) {
          console.log("useGameDatabase.ts: В игре 2 игрока, запуск обратного отсчета...")
          startGameCountdown(currentGameId)
        } else {
          console.log("useGameDatabase.ts: В игре 2 игрока, обратный отсчет уже запущен:", timeLeft, "секунд осталось")
          setGameCountdown(timeLeft)
        }
      }

      checkAndStartCountdown()
    }
  }, [currentGameId, dbPlayers.length, startGameCountdown])

  // Initialize countdown on component mount if game already has countdown
  useEffect(() => {
    console.log(
      "useGameDatabase.ts: Эффект инициализации обратного отсчета при монтировании: currentGameId",
      currentGameId,
      "gameCountdown",
      gameCountdown,
    )
    if (currentGameId && gameCountdown === null) {
      const initializeCountdown = async () => {
        const { timeLeft } = await dbHelpers.getGameCountdown(currentGameId)
        if (timeLeft !== null && timeLeft > 0) {
          console.log(
            "useGameDatabase.ts: Инициализация обратного отсчета при монтировании:",
            timeLeft,
            "секунд осталось",
          )
          setGameCountdown(timeLeft)
        }
      }

      initializeCountdown()
    }
  }, [currentGameId, gameCountdown])

  // Countdown timer effect
  useEffect(() => {
    console.log("useGameDatabase.ts: Эффект таймера обратного отсчета: currentGameId", currentGameId)
    let interval: NodeJS.Timeout | null = null

    if (currentGameId) {
      // Initial countdown check
      const checkCountdown = async () => {
        const timeLeft = await getGameCountdown(currentGameId)
        if (timeLeft !== null) {
          setGameCountdown(timeLeft)
          if (timeLeft <= 0) {
            console.log("useGameDatabase.ts: Обратный отсчет достиг нуля, должен сработать спин")
          }
        }
      }

      // Check immediately
      checkCountdown()

      // Update countdown every second
      interval = setInterval(async () => {
        const timeLeft = await getGameCountdown(currentGameId)
        if (timeLeft !== null) {
          setGameCountdown(timeLeft)
          if (timeLeft <= 0) {
            console.log("useGameDatabase.ts: Обратный отсчет достиг нуля, должен сработать спин")
            // Stop the interval once countdown reaches 0
            if (interval) {
              clearInterval(interval)
              interval = null
            }
          }
        }
      }, 1000)
    } else {
      // Reset countdown when no game
      setGameCountdown(null)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [currentGameId, getGameCountdown])

  const createGame = useCallback(
    async (player1Id: string) => {
      console.log("useGameDatabase.ts: createGame вызван с player1Id:", player1Id)
      try {
        const { data, error } = await supabase
          .from("games")
          .insert({ player1_id: player1Id, status: "waiting", created_at: new Date().toISOString() })
          .select()
          .single()

        if (error) {
          throw error
        }
        setCurrentGame(data)
        console.log("useGameDatabase.ts: Игра создана:", data)
        return data
      } catch (error) {
        console.error("useGameDatabase.ts: Ошибка создания игры:", error)
        setErrorGame(error as Error)
        return null
      }
    },
    [supabase],
  )

  const joinGame = useCallback(
    async (gameId: string, player2Id: string) => {
      console.log("useGameDatabase.ts: joinGame вызван с gameId:", gameId, "player2Id:", player2Id)
      try {
        const { data, error } = await supabase
          .from("games")
          .update({ player2_id: player2Id, status: "active" })
          .eq("id", gameId)
          .select()
          .single()

        if (error) {
          throw error
        }
        setCurrentGame(data)
        console.log("useGameDatabase.ts: Игра присоединена:", data)
        return data
      } catch (error) {
        console.error("useGameDatabase.ts: Ошибка присоединения к игре:", error)
        setErrorGame(error as Error)
        return null
      }
    },
    [supabase],
  )

  const updateGameStatus = useCallback(
    async (gameId: string, status: Game["status"]) => {
      console.log("useGameDatabase.ts: updateGameStatus вызван с gameId:", gameId, "status:", status)
      try {
        const { data, error } = await supabase.from("games").update({ status }).eq("id", gameId).select().single()

        if (error) {
          throw error
        }
        setCurrentGame(data)
        console.log("useGameDatabase.ts: Статус игры обновлен:", data)
        return data
      } catch (error) {
        console.error("useGameDatabase.ts: Ошибка обновления статуса игры:", error)
        setErrorGame(error as Error)
        return null
      }
    },
    [supabase],
  )

  const updateGameRollAndWinner = useCallback(
    async (gameId: string, rollNumber: number, winnerId: string, status: Game["status"]) => {
      console.log(
        "useGameDatabase.ts: updateGameRollAndWinner вызван с gameId:",
        gameId,
        "rollNumber:",
        rollNumber,
        "winnerId:",
        winnerId,
        "status:",
        status,
      )
      try {
        const { data, error } = await supabase
          .from("games")
          .update({ roll_number: rollNumber, winner_id: winnerId, status, end_time: new Date().toISOString() })
          .eq("id", gameId)
          .select()
          .single()

        if (error) {
          throw error
        }
        setCurrentGame(data)
        console.log("useGameDatabase.ts: Ролл игры и победитель обновлены:", data)
        return data
      } catch (error) {
        console.error("useGameDatabase.ts: Ошибка обновления ролла игры и победителя:", error)
        setErrorGame(error as Error)
        return null
      }
    },
    [supabase],
  )

  const subscribeToGameChanges = useCallback(
    (callback: (payload: any) => void) => {
      console.log("useGameDatabase.ts: subscribeToGameChanges вызван.")
      const channel = supabase
        .channel("game_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "games" }, callback)
        .subscribe()

      return channel
    },
    [supabase],
  )

  const fetchGifts = useCallback(async () => {
    console.log("useGameDatabase.ts: fetchGifts вызван.")
    try {
      const { data, error } = await supabase.from("gifts").select("*").order("value", { ascending: true })

      if (error) {
        throw error
      }
      return data as Gift[]
    } catch (error) {
      console.error("useGameDatabase.ts: Ошибка получения подарков:", error)
      setErrorGame(error as Error)
      return null
    }
  }, [supabase])

  return {
    // State
    currentGameId,
    currentPlayer,
    dbPlayers,
    dbGameLogs,
    dbMatchHistory,
    playerInventory,
    availableGifts,
    gameCountdown,
    loading,
    error,
    currentGame,
    isLoadingGame,
    errorGame,

    // Actions
    initializePlayer,
    getCurrentGame: getCurrentGameData,
    joinGameWithGifts,
    completeGame,
    addGameLog,
    loadGameLogs,
    loadMatchHistory,
    loadPlayerInventory,
    loadAvailableGifts,
    loadGameParticipants,
    startGameCountdown,
    getGameCountdown,
    createGame,
    joinGame,
    updateGameStatus,
    updateGameRollAndWinner,
    subscribeToGameChanges,
    fetchGifts,

    // Utilities
    clearError: () => setError(null),
  }
}
