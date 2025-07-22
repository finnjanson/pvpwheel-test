"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { useGameDatabase } from "@/hooks/useGameDatabase"
import { useGameState } from "@/hooks/useGameState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

console.log("WheelGame.tsx: Компонент WheelGame загружен.")

// Telegram WebApp types
interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    start_param?: string
  }
  ready: () => void
  expand: () => void
  close: () => void
  openLink: (url: string) => void
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void
    notificationOccurred: (type: "error" | "success" | "warning") => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface Player {
  id: string
  name: string
  balance: number
  color: string
  gifts: string[] // Array of gift emojis
  giftValue: number // Total TON value of gifts
  telegramUser?: TelegramUser // Store Telegram user data for avatar
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

// Define types for Gift
interface Gift {
  id: string
  name: string
  description: string
  image_url: string
  value: number
}

type HistoryFilter = "time" | "luckiest" | "fattest"

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#85929E",
  "#D7BDE2",
]

const SPIN_DURATION = 4000
const COUNTDOWN_DURATION = 60

// NFT Deposit configuration - Telegram-based
const NFT_DEPOSIT_TELEGRAM = "@pwpwheel" // Telegram username for NFT gift transfers

export default function WheelGame() {
  console.log("WheelGame.tsx: Рендеринг компонента WheelGame.")
  const {
    currentGame,
    isLoadingGame,
    errorGame,
    createGame,
    joinGame,
    updateGameStatus,
    updateGameRollAndWinner,
    subscribeToGameChanges,
    fetchGifts,
  } = useGameDatabase()
  const {
    gameState,
    setGameState,
    spinWheel: spinWheelHook,
    resetWheel,
    isSpinning,
    spinResult,
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer,
  } = useGameState()

  const [showNftDeposit, setShowNftDeposit] = useState(false)
  const [nftAmount, setNftAmount] = useState("")
  const [showGiftSelection, setShowGiftSelection] = useState(false)
  const [availableGifts, setAvailableGifts] = useState<Gift[]>([])
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)
  const [activeNav, setActiveNav] = useState("pvp") // 'pvp', 'gifts', 'earn'
  // Database integration
  const {
    dbPlayers,
    dbGameLogs,
    dbMatchHistory,
    playerInventory,
    gameCountdown,
    loading: dbLoading,
    error: dbError,
    initializePlayer,
    getCurrentGame,
    joinGameWithGifts,
    completeGame,
    addGameLog: addDbGameLog,
    loadMatchHistory,
    loadGameParticipants,
    clearError,
  } = useGameDatabase()

  const [players, setPlayers] = useState<Player[]>([])
  const [gameLog, setGameLog] = useState<GameLog[]>([])
  const [winner, setWinner] = useState<Player | null>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [playerBalance, setPlayerBalance] = useState("")
  const [activeTab, setActiveTab] = useState<"pvp" | "gifts" | "earn">("pvp")
  const [rollNumber, setRollNumber] = useState(8343) // Persistent roll number
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([])
  const [showMatchHistory, setShowMatchHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("time")
  const [userInventory, setUserInventory] = useState<Gift[]>([])
  const [showGiftPopup, setShowGiftPopup] = useState(false)
  const [selectedGifts, setSelectedGifts] = useState<{ id: string; quantity: number }[]>([])
  const [showPlayerGiftsPopup, setShowPlayerGiftsPopup] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // NFT Deposit states
  const [showNftDepositPopup, setShowNftDepositPopup] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)

  // Telegram WebApp state
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Avatar cache to store loaded images
  const avatarCache = useRef<Map<string, HTMLImageElement>>(new Map())

  // Helper function to load and cache Telegram avatars
  const loadTelegramAvatar = useCallback(async (photoUrl: string): Promise<HTMLImageElement> => {
    console.log("WheelGame.tsx: Попытка загрузить аватар:", photoUrl)
    // Check cache first
    if (avatarCache.current.has(photoUrl)) {
      console.log("WheelGame.tsx: Аватар найден в кэше:", photoUrl)
      return avatarCache.current.get(photoUrl)!
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      // Remove crossOrigin to avoid CORS issues with Telegram avatars
      img.onload = () => {
        console.log("WheelGame.tsx: Аватар успешно загружен:", photoUrl)
        avatarCache.current.set(photoUrl, img)
        resolve(img)
      }
      img.onerror = (error) => {
        console.error("WheelGame.tsx: Ошибка загрузки аватара:", photoUrl, error)
        reject(error)
      }
      img.src = photoUrl
    })
  }, [])

  // Preload all player avatars
  const preloadAvatars = useCallback(async () => {
    console.log("WheelGame.tsx: Предварительная загрузка аватаров...")
    const promises = players
      .filter((player) => player.telegramUser?.photo_url)
      .map((player) => {
        console.log(
          "WheelGame.tsx: Предварительная загрузка аватара для:",
          player.name,
          "URL:",
          player.telegramUser?.photo_url,
        )
        return loadTelegramAvatar(player.telegramUser!.photo_url!)
      })

    console.log("WheelGame.tsx: Найдено", promises.length, "аватаров для предварительной загрузки")

    try {
      await Promise.all(promises)
      console.log("WheelGame.tsx: Все аватары предварительно загружены успешно")
      return true // Return success status
    } catch (error) {
      console.warn("WheelGame.tsx: Некоторые аватары не удалось загрузить:", error)
      return false
    }
  }, [players, loadTelegramAvatar])

  const addToLog = useCallback(
    (message: string, type: GameLog["type"] = "info") => {
      const newLog: GameLog = {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        type,
      }
      setGameLog((prev) => [newLog, ...prev.slice(0, 19)])

      // Add haptic feedback for Telegram WebApp
      if (webApp?.HapticFeedback) {
        switch (type) {
          case "winner":
            webApp.HapticFeedback.notificationOccurred("success")
            break
          case "join":
            webApp.HapticFeedback.impactOccurred("light")
            break
          case "spin":
            webApp.HapticFeedback.impactOccurred("medium")
            break
        }
      }
    },
    [webApp],
  )

  const drawWheel = useCallback(() => {
    console.log("WheelGame.tsx: Рисование колеса...")
    const canvas = canvasRef.current
    if (!canvas) {
      console.log("WheelGame.tsx: Canvas не найден, пропуск рисования колеса.")
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.log("WheelGame.tsx: Контекст Canvas не найден, пропуск рисования колеса.")
      return
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 140

    ctx.clearRect(0, 0, canvas.width, canvas.width)

    // Use activePlayers instead of players
    const activePlayers = dbPlayers.length > 0 ? dbPlayers : players
    console.log("WheelGame.tsx: Активные игроки для рисования:", activePlayers.length)

    if (activePlayers.length === 0) {
      // Draw empty wheel with transparent background
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, "rgba(75, 85, 99, 0.3)")
      gradient.addColorStop(1, "rgba(55, 65, 81, 0.5)")

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = "rgba(156, 163, 175, 0.5)"
      ctx.lineWidth = 3
      ctx.stroke()
      console.log("WheelGame.tsx: Нарисовано пустое колесо.")
      return
    }

    const totalValue = activePlayers.reduce((sum, player) => sum + player.balance + player.giftValue, 0)
    let currentAngle = -Math.PI / 2 // Start at top (12 o'clock position) where the arrow points

    activePlayers.forEach((player) => {
      const playerValue = player.balance + player.giftValue
      const segmentAngle = (playerValue / totalValue) * 2 * Math.PI

      // Draw segment
      ctx.fillStyle = player.color
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
      ctx.closePath()
      ctx.fill()

      // Remove the white border between segments

      // Draw avatar and value if segment is large enough
      if (segmentAngle > 0.2) {
        const textAngle = currentAngle + segmentAngle / 2
        const textRadius = radius * 0.7
        const textX = centerX + Math.cos(textAngle) * textRadius
        const textY = centerY + Math.sin(textAngle) * textRadius

        ctx.save()
        ctx.translate(textX, textY)
        // Remove rotation adjustment since we want avatars to stay upright

        // Draw avatar circle
        const avatarRadius = 14 // Reduced from 18 to 14

        // Check if player has Telegram photo and it's cached
        if (player.telegramUser?.photo_url && avatarCache.current.has(player.telegramUser.photo_url)) {
          console.log("WheelGame.tsx: Рисование кэшированного аватара для:", player.name)
          const avatarImg = avatarCache.current.get(player.telegramUser.photo_url)!

          try {
            ctx.save()
            ctx.beginPath()
            ctx.arc(0, 0, avatarRadius, 0, 2 * Math.PI) // Changed from (0, -8) to (0, 0)
            ctx.clip()
            ctx.drawImage(avatarImg, -avatarRadius, -avatarRadius, avatarRadius * 2, avatarRadius * 2)
            ctx.restore()

            // Draw white border around avatar
            ctx.strokeStyle = "#fff"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(0, 0, avatarRadius, 0, 2 * Math.PI) // Changed from (0, -8) to (0, 0)
            ctx.stroke()
          } catch (error) {
            console.error("WheelGame.tsx: Ошибка рисования аватара для:", player.name, error)
            drawFallbackAvatar()
          }
        } else {
          // Draw fallback avatar
          console.log(
            "WheelGame.tsx: Рисование запасного аватара для:",
            player.name,
            "Есть URL фото:",
            !!player.telegramUser?.photo_url,
            "В кэше:",
            player.telegramUser?.photo_url ? avatarCache.current.has(player.telegramUser.photo_url) : false,
          )
          drawFallbackAvatar()
        }

        // Function to draw fallback avatar
        function drawFallbackAvatar() {
          if (!ctx) return

          const gradient = ctx.createLinearGradient(-avatarRadius, -avatarRadius, avatarRadius, avatarRadius)
          gradient.addColorStop(0, "#60A5FA") // blue-400
          gradient.addColorStop(1, "#A855F7") // purple-500

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(0, 0, avatarRadius, 0, 2 * Math.PI) // Changed from (0, -8) to (0, 0)
          ctx.fill()

          // Draw white border around avatar
          ctx.strokeStyle = "#fff"
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw user initial in avatar
          ctx.fillStyle = "#fff"
          ctx.font = "bold 16px DM Sans"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(player.name.charAt(0).toUpperCase(), 0, 0) // Changed from (0, -8) to (0, 0)
        }

        ctx.restore()
      }

      currentAngle += segmentAngle
    })

    // Draw outer border
    ctx.strokeStyle = "rgba(156, 163, 175, 0.7)"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()
    console.log("WheelGame.tsx: Колесо нарисовано.")
  }, [players, dbPlayers])

  const addPlayer = () => {
    const name = playerName.trim()
    const balance = Number.parseInt(playerBalance)

    if (!name || !balance || balance < 1 || balance > 10000) {
      alert("Пожалуйста, введите действительное имя и баланс (1-10,000)!")
      return
    }

    if (players.some((p) => p.name === name)) {
      alert("Имя игрока уже существует!")
      return
    }

    if (players.length >= 15) {
      alert("Разрешено максимум 15 игроков!")
      return
    }

    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      balance,
      color: COLORS[players.length % COLORS.length],
      gifts: ["🎁", "💎", "⭐"].slice(0, Math.floor(Math.random() * 3) + 1), // Random 1-3 gifts
      giftValue: Math.random() * 0.5 + 0.1, // Random gift value between 0.1-0.6 TON
      // No telegramUser for test players - they'll get fallback avatars
    }

    setPlayers((prev) => [...prev, newPlayer])
    addToLog(`🎉 ${name} присоединился с $${balance.toLocaleString()}!`, "join")
    setPlayerName("")
    setPlayerBalance("")
  }

  const [isSpinningState, setIsSpinningState] = useState(false)
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)

  const spinWheel = useCallback(async () => {
    console.log("WheelGame.tsx: Запуск вращения колеса.")
    // Use activePlayers for consistency with display
    const activePlayers = dbPlayers.length > 0 ? dbPlayers : players

    if (activePlayers.length < 2) {
      addToLog("⚠️ Нужно минимум 2 игрока, чтобы крутить колесо!", "info")
      return
    }

    if (isSpinningState) return

    setIsSpinningState(true)
    addToLog("🎰 Колесо крутится... Всем удачи!", "spin")

    // Add to database log
    if (currentGameId) {
      await addDbGameLog(currentGameId, null, "spin", "🎰 Колесо крутится... Всем удачи!")
    }

    // Preload avatars before spinning
    await preloadAvatars()

    const totalValue = activePlayers.reduce((sum, player) => sum + player.balance + player.giftValue, 0)
    const randomValue = Math.random() * totalValue

    let currentSum = 0
    let selectedWinner: Player | null = null

    for (const player of activePlayers) {
      const playerValue = player.balance + player.giftValue
      currentSum += playerValue
      if (randomValue <= currentSum) {
        selectedWinner = player
        break
      }
    }

    // Animate wheel rotation
    const canvas = canvasRef.current
    if (canvas) {
      const spins = 5 + Math.random() * 3
      const finalRotation = spins * 360 + Math.random() * 360
      canvas.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      canvas.style.transform = `rotate(${finalRotation}deg)`
    }

    spinTimeoutRef.current = setTimeout(async () => {
      if (selectedWinner) {
        const totalBalance = activePlayers.reduce((sum, player) => sum + player.balance, 0)
        const totalGiftValue = activePlayers.reduce((sum, player) => sum + player.giftValue, 0)
        const playerValue = selectedWinner.balance + selectedWinner.giftValue
        const winnerChance = (playerValue / totalValue) * 100

        // Complete game in database
        if (currentGameId && currentPlayer) {
          try {
            await completeGame(currentGameId, currentPlayer.id, winnerChance, totalGiftValue)

            // Add winner log to database
            await addDbGameLog(
              currentGameId,
              currentPlayer.id,
              "winner",
              `🎉 ${selectedWinner.name} выиграл ${totalGiftValue.toFixed(3)} TON в подарках!`,
            )

            // Reload match history
            await loadMatchHistory()
          } catch (error) {
            console.error("WheelGame.tsx: Не удалось завершить игру в базе данных:", error)
          }
        }

        // Add to match history
        const matchEntry: MatchHistoryEntry = {
          id: Date.now().toString(),
          rollNumber: rollNumber,
          timestamp: new Date(),
          players: [...activePlayers], // Use activePlayers for consistency
          winner: selectedWinner,
          totalPot: totalGiftValue, // Only TON gifts now
          winnerChance: winnerChance,
        }
        setMatchHistory((prev) => [matchEntry, ...prev])

        setWinner(selectedWinner)
        setShowWinnerModal(true)
        addToLog(`🎉 ${selectedWinner.name} выиграл ${totalGiftValue.toFixed(3)} TON в подарках!`, "winner")
        setRollNumber((prev) => prev + 1) // Increment roll number for next game
      }
      setTimeout(async () => {
        setIsSpinningState(false)
        setPlayers([])
        setWinner(null)
        setShowWinnerModal(false)

        // Create new game for next round
        if (currentPlayer) {
          try {
            await getCurrentGame(rollNumber + 1)
          } catch (error) {
            console.error("WheelGame.tsx: Не удалось создать новую игру:", error)
          }
        }

        if (canvas) {
          canvas.style.transition = "none"
          canvas.style.transform = "rotate(0deg)"
        }
      }, 3000)
    }, SPIN_DURATION)
  }, [
    players,
    isSpinningState,
    addToLog,
    preloadAvatars,
    rollNumber,
    currentGameId,
    currentPlayer,
    addDbGameLog,
    completeGame,
    loadMatchHistory,
    getCurrentGame,
    dbPlayers, // Добавлено для зависимости
  ])

  // Auto-spin when countdown reaches 0
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект авто-вращения: gameCountdown", gameCountdown, "isSpinningState", isSpinningState)
    const activePlayers = dbPlayers.length > 0 ? dbPlayers : players
    if (gameCountdown === 0 && !isSpinningState && activePlayers.length >= 2) {
      console.log("WheelGame.tsx: Таймер базы данных достиг 0, вращение колеса.")
      spinWheel()
    }
  }, [gameCountdown, isSpinningState, dbPlayers, players, spinWheel])

  // Draw wheel when players change
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект рисования колеса: игроки изменились.")
    const loadAndDrawWheel = async () => {
      const avatarsLoaded = await preloadAvatars()
      drawWheel()
      // If avatars were loaded, force another redraw to ensure they appear
      if (avatarsLoaded && players.some((p) => p.telegramUser?.photo_url)) {
        setTimeout(() => drawWheel(), 200)
      }
    }
    loadAndDrawWheel()
  }, [players, drawWheel, preloadAvatars])

  // Redraw wheel when database players change
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект рисования колеса: игроки из БД изменились.")
    const loadAndDrawWheel = async () => {
      const avatarsLoaded = await preloadAvatars()
      drawWheel()
      // If avatars were loaded, force another redraw to ensure they appear
      if (avatarsLoaded && dbPlayers.some((p) => p.telegramUser?.photo_url)) {
        setTimeout(() => drawWheel(), 200)
      }
    }
    loadAndDrawWheel()
  }, [dbPlayers, drawWheel, preloadAvatars])

  // Redraw wheel when switching back to PvP tab or closing match history
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект рисования колеса: активная вкладка/история матчей изменились.")
    if (activeTab === "pvp" && !showMatchHistory) {
      const loadAndDrawWheel = async () => {
        await preloadAvatars()
        drawWheel()
      }
      loadAndDrawWheel()
    }
  }, [activeTab, showMatchHistory, drawWheel, preloadAvatars])

  // Cleanup
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект очистки.")
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current)
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
    }
  }, [])

  // Initialize inventory from database (real player inventory)
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект инициализации инвентаря игрока.")
    // Use real player inventory instead of simulated data
    if (playerInventory && playerInventory.length > 0) {
      const realInventory = playerInventory.map((item) => ({
        id: item.gift_id,
        emoji: item.gifts?.emoji || "🎁",
        name: item.gifts?.name || "Неизвестный подарок",
        value: item.gifts?.base_value || 0,
        rarity: item.gifts?.rarity || "common",
        quantity: item.quantity || 0,
        nft_address: item.gifts?.nft_address,
        nft_item_id: item.gifts?.nft_item_id,
        is_nft: item.gifts?.is_nft || false,
      }))
      setUserInventory(realInventory)
    } else {
      // Clear inventory if no gifts in database
      setUserInventory([])
    }
  }, [playerInventory])

  // Load current game on component mount (for cross-device visibility)
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект загрузки текущей игры при монтировании.")
    const loadCurrentGame = async () => {
      try {
        console.log("🎮 PvP Wheel: Загрузка текущего состояния игры...")

        // Pass 0 as rollNumber to only load existing games, not create new ones
        const game = await getCurrentGame(0)
        if (game) {
          console.log(
            "✅ Текущая игра загружена:",
            game.roll_number,
            "с",
            game.game_participants?.length || 0,
            "игроками",
          )

          // Load participants for this game
          await loadGameParticipants(game.id)
          setCurrentGameId(game.id)
          setCurrentPlayer(game.game_participants?.[0] || null)
        } else {
          console.log("ℹ️ Нет текущей игры - будет создана, когда присоединится первый пользователь")
        }
      } catch (error) {
        console.error("❌ Не удалось загрузить текущую игру:", error)
      } finally {
        // Устанавливаем isLoadingGame в false после попытки загрузки
        // Это важно, чтобы UI не оставался в состоянии загрузки
        // если getCurrentGame завершится ошибкой или не найдет игру.
        // Предполагается, что isLoadingGame управляется useGameDatabase
        // и этот useEffect просто реагирует на его изменения.
        // Если isLoadingGame управляется здесь, то нужно добавить useState для него.
      }
    }

    // Only load if we don't already have a current game
    if (!currentGameId) {
      loadCurrentGame()
    }
  }, [getCurrentGame, loadGameParticipants, currentGameId])

  // Mock Telegram WebApp for local development
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект инициализации Telegram WebApp.")
    if (typeof window !== "undefined" && !window.Telegram) {
      console.log("WheelGame.tsx: Мокирование Telegram WebApp.")
      window.Telegram = {
        WebApp: {
          initData:
            "query_id=AAH_test&user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%7D&auth_date=1678886400&hash=abcdef12345",
          initDataUnsafe: {
            query_id: "AAH_test",
            user: {
              id: 12345,
              first_name: "Test",
              last_name: "User",
              username: "testuser",
              language_code: "en",
              is_premium: true,
            },
            auth_date: 1678886400,
            hash: "abcdef12345",
          },
          ready: () => console.log("Telegram WebApp ready (mocked)."),
          expand: () => console.log("Telegram WebApp expanded (mocked)."),
          onEvent: (eventType, callback) => {
            console.log(`Telegram WebApp event listener added for: ${eventType}`)
            // You can manually trigger callbacks for testing specific events
          },
          offEvent: (eventType, callback) => console.log(`Telegram WebApp event listener removed for: ${eventType}`),
          MainButton: {
            text: "",
            color: "",
            textColor: "",
            isVisible: false,
            isActive: true,
            setText: (text) => {
              console.log(`MainButton setText: ${text}`)
              this.text = text
            },
            show: () => {
              console.log("MainButton show")
              this.isVisible = true
            },
            hide: () => {
              console.log("MainButton hide")
              this.isVisible = false
            },
            onClick: (callback) => {
              console.log("MainButton onClick registered")
            },
            offClick: (callback) => {
              console.log("MainButton offClick unregistered")
            },
          },
          BackButton: {
            isVisible: false,
            show: () => {
              console.log("BackButton show")
              this.isVisible = true
            },
            hide: () => {
              console.log("BackButton hide")
              this.isVisible = false
            },
            onClick: (callback) => {
              console.log("BackButton onClick registered")
            },
            offClick: (callback) => {
              console.log("BackButton offClick unregistered")
            },
          },
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportStableHeight: window.innerHeight,
          themeParams: {
            bg_color: "#ffffff",
            text_color: "#000000",
            hint_color: "#aaaaaa",
            link_color: "#0000ff",
            button_color: "#0088cc",
            button_text_color: "#ffffff",
            secondary_bg_color: "#f0f0f0",
          },
          colorScheme: "light",
          version: "6.9",
          platform: "tdesktop",
          isVersionAtLeast: (version) => true, // Always true for mock
          sendData: (data) => console.log("Telegram WebApp sendData:", data),
          close: () => console.log("Telegram WebApp close"),
          HapticFeedback: {
            impactOccurred: (style) => console.log(`HapticFeedback impactOccurred: ${style}`),
            notificationOccurred: (type) => console.log(`HapticFeedback notificationOccurred: ${type}`),
            selectionChanged: () => console.log("HapticFeedback selectionChanged"),
          },
        },
      }
    }
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
      console.log("WheelGame.tsx: Telegram WebApp инициализирован и развернут.")
      console.log("WheelGame.tsx: Telegram WebApp initData:", window.Telegram.WebApp.initDataUnsafe)
      setWebApp(window.Telegram.WebApp) // Устанавливаем webApp в состояние
      setTelegramUser(window.Telegram.WebApp.initDataUnsafe?.user || null) // Устанавливаем telegramUser
    } else {
      console.warn("WheelGame.tsx: Объект Telegram WebApp не найден или не в среде браузера.")
    }
  }, [])

  // Subscribe to game changes
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект подписки на изменения игры.")
    const unsubscribe = subscribeToGameChanges((payload) => {
      console.log("WheelGame.tsx: Изменение в реальном времени:", payload)
      if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
        const updatedGame = payload.new
        if (updatedGame.status === "waiting" && updatedGame.player1_id && !updatedGame.player2_id) {
          setGameState({ status: "waiting", gameId: updatedGame.id, player1Id: updatedGame.player1_id })
          startTimer(updatedGame.created_at)
          setCurrentGameId(updatedGame.id)
          setCurrentPlayer(
            updatedGame.player1_id
              ? { id: updatedGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
              : null,
          )
        } else if (updatedGame.status === "active" && updatedGame.player1_id && updatedGame.player2_id) {
          setGameState({
            status: "active",
            gameId: updatedGame.id,
            player1Id: updatedGame.player1_id,
            player2Id: updatedGame.player2_id,
          })
          stopTimer()
          setCurrentGameId(updatedGame.id)
          setCurrentPlayer(
            updatedGame.player1_id
              ? { id: updatedGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
              : null,
          )
        } else if (updatedGame.status === "completed" && updatedGame.roll_number !== null) {
          setGameState({
            status: "completed",
            gameId: updatedGame.id,
            rollNumber: updatedGame.roll_number,
            winnerId: updatedGame.winner_id,
          })
          stopTimer()
          setCurrentGameId(updatedGame.id)
          setCurrentPlayer(
            updatedGame.player1_id
              ? { id: updatedGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
              : null,
          )
        }
      }
    })

    return () => {
      if (unsubscribe) {
        unsubscribe.unsubscribe()
      }
    }
  }, [subscribeToGameChanges, setGameState, startTimer, stopTimer])

  // Handle initial game load from database
  useEffect(() => {
    console.log("WheelGame.tsx: Эффект обработки начальной загрузки игры из БД.")
    if (!isLoadingGame && !errorGame && currentGame) {
      if (currentGame.status === "waiting") {
        setGameState({ status: "waiting", gameId: currentGame.id, player1Id: currentGame.player1_id })
        startTimer(currentGame.created_at)
        setCurrentGameId(currentGame.id)
        setCurrentPlayer(
          currentGame.player1_id
            ? { id: currentGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
            : null,
        )
      } else if (currentGame.status === "active") {
        setGameState({
          status: "active",
          gameId: currentGame.id,
          player1Id: currentGame.player1_id,
          player2Id: currentGame.player2_id,
        })
        stopTimer()
        setCurrentGameId(currentGame.id)
        setCurrentPlayer(
          currentGame.player1_id
            ? { id: currentGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
            : null,
        )
      } else if (currentGame.status === "completed") {
        setGameState({
          status: "completed",
          gameId: currentGame.id,
          rollNumber: currentGame.roll_number,
          winnerId: currentGame.winner_id,
        })
        stopTimer()
        setCurrentGameId(currentGame.id)
        setCurrentPlayer(
          currentGame.player1_id
            ? { id: currentGame.player1_id.toString(), name: "", balance: 0, color: "", gifts: [], giftValue: 0 }
            : null,
        )
      }
    } else if (!isLoadingGame && !currentGame) {
      setGameState({ status: "idle" })
      resetTimer()
    }
  }, [currentGame, isLoadingGame, errorGame, setGameState, startTimer, stopTimer, resetTimer])

  const handleCreateGame = useCallback(async () => {
    console.log("WheelGame.tsx: Обработчик создания игры.")
    const userId = window.Telegram.WebApp.initDataUnsafe?.user?.id?.toString() || "mock_user_1"
    await createGame(userId)
  }, [createGame])

  const handleJoinGame = useCallback(async () => {
    console.log("WheelGame.tsx: Обработчик присоединения к игре.")
    const userId = window.Telegram.WebApp.initDataUnsafe?.user?.id?.toString() || "mock_user_2"
    if (currentGame?.id) {
      await joinGame(currentGame.id, userId)
    }
  }, [joinGame, currentGame])

  const handleSpin = useCallback(async () => {
    console.log("WheelGame.tsx: Обработчик вращения колеса.")
    if (gameState.status === "active" && gameState.gameId) {
      const roll = Math.floor(Math.random() * 100) + 1 // Roll between 1 and 100
      const winnerId = roll % 2 === 0 ? gameState.player1Id : gameState.player2Id // Even for player1, odd for player2
      await spinWheelHook(roll, () => {
        if (gameState.gameId && winnerId) {
          updateGameRollAndWinner(gameState.gameId, roll, winnerId, "completed")
        }
      })
    }
  }, [gameState, spinWheelHook, updateGameRollAndWinner])

  const handleResetGame = useCallback(() => {
    console.log("WheelGame.tsx: Обработчик сброса игры.")
    resetWheel()
    setGameState({ status: "idle" })
    resetTimer()
  }, [resetWheel, setGameState, resetTimer])

  const handleNftDeposit = useCallback(() => {
    console.log("WheelGame.tsx: Обработчик депозита NFT.")
    setShowNftDeposit(true)
  }, [])

  const confirmNftDeposit = useCallback(() => {
    console.log(`WheelGame.tsx: Подтверждение депозита NFT с суммой: ${nftAmount}`)
    // Here you would integrate with TON blockchain or similar
    setShowNftDeposit(false)
    setNftAmount("")
    // Potentially update game state or user balance
  }, [nftAmount])

  const handleGiftSelection = useCallback(async () => {
    console.log("WheelGame.tsx: Обработчик выбора подарка.")
    const gifts = await fetchGifts()
    if (gifts) {
      setAvailableGifts(gifts)
      setShowGiftSelection(true)
    }
  }, [fetchGifts])

  const confirmGiftSelection = useCallback(() => {
    console.log("WheelGame.tsx: Подтверждение выбора подарка.")
    if (selectedGift) {
      console.log(`WheelGame.tsx: Выбранный подарок: ${selectedGift.name} (Значение: ${selectedGift.value})`)
      // Logic to apply gift, e.g., add to user inventory, use in game
    }
    setShowGiftSelection(false)
    setSelectedGift(null)
  }, [selectedGift])

  const renderGameContent = () => {
    console.log(
      "WheelGame.tsx: Рендеринг игрового контента. Текущий статус:",
      gameState.status,
      "isLoadingGame:",
      isLoadingGame,
      "errorGame:",
      errorGame,
    )
    if (isLoadingGame) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-2 text-gray-400">Загрузка игры...</p>
        </div>
      )
    }

    if (errorGame) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <p>Ошибка загрузки игры: {errorGame.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Повторить
          </Button>
        </div>
      )
    }

    switch (gameState.status) {
      case "idle":
        return (
          <>
            <h1 className="text-3xl font-bold mb-8">PvP Wheel</h1>
            <Button onClick={handleCreateGame} className="w-48 h-12 text-lg">
              Начать игру
            </Button>
            <Button onClick={handleNftDeposit} className="w-48 h-12 text-lg mt-4 bg-purple-600 hover:bg-purple-700">
              Внести NFT
            </Button>
          </>
        )
      case "waiting":
        const isPlayer1 = window.Telegram.WebApp.initDataUnsafe?.user?.id?.toString() === gameState.player1Id
        return (
          <>
            <h1 className="text-3xl font-bold mb-8">Ожидание оппонента...</h1>
            <p className="text-xl mb-4">Время ожидания: {timeRemaining} сек.</p>
            {!isPlayer1 && (
              <Button onClick={handleJoinGame} className="w-48 h-12 text-lg">
                Присоединиться
              </Button>
            )}
            <Button onClick={handleResetGame} className="w-48 h-12 text-lg mt-4 bg-red-600 hover:bg-red-700">
              Отменить игру
            </Button>
          </>
        )
      case "active":
        return (
          <>
            <h1 className="text-3xl font-bold mb-8">Игра началась!</h1>
            <div className="wheel-container relative">
              <canvas ref={canvasRef} width={300} height={300} className="wheel-canvas" />
              <div className="pointer absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-r-[15px] border-b-[30px] border-l-transparent border-r-transparent border-b-yellow-400 z-10" />
            </div>
            <Button onClick={spinWheel} disabled={isSpinningState} className="w-48 h-12 text-lg mt-8">
              {isSpinningState ? "Крутится..." : "Крутить колесо"}
            </Button>
          </>
        )
      case "completed":
        const isWinner = window.Telegram.WebApp.initDataUnsafe?.user?.id?.toString() === gameState.winnerId
        return (
          <>
            <h1 className="text-3xl font-bold mb-8">Игра завершена!</h1>
            <p className="text-xl mb-4">Выпало число: {gameState.rollNumber}</p>
            <p className={`text-2xl font-bold ${isWinner ? "text-green-500" : "text-red-500"} mb-8`}>
              {isWinner ? "Вы выиграли!" : "Вы проиграли!"}
            </p>
            <Button onClick={handleResetGame} className="w-48 h-12 text-lg">
              Новая игра
            </Button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      <main className="flex-grow flex flex-col items-center justify-center p-4 pb-[80px]">{renderGameContent()}</main>

      {/* NFT Deposit Popup */}
      <Dialog open={showNftDeposit} onOpenChange={setShowNftDeposit}>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-blue-500">Внести NFT</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-gray-300">Введите сумму NFT для депозита:</p>
            <Input
              id="nft-amount"
              type="number"
              placeholder="0.00"
              value={nftAmount}
              onChange={(e) => setNftAmount(e.target.value)}
              className="col-span-3 bg-[#0a0a0a] text-white border-gray-600"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNftDeposit(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Отмена
            </Button>
            <Button onClick={confirmNftDeposit} className="bg-blue-600 hover:bg-blue-700 text-white">
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift Selection Popup */}
      <Dialog open={showGiftSelection} onOpenChange={setShowGiftSelection}>
        <DialogContent className="sm:max-w-[600px] bg-[#1a1a1a] text-white border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-500">Выберите подарок</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {availableGifts.length > 0 ? (
              availableGifts.map((gift) => (
                <div
                  key={gift.id}
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedGift?.id === gift.id ? "border-blue-500 bg-blue-900/20" : "border-gray-700 bg-gray-800"
                  }`}
                  onClick={() => setSelectedGift(gift)}
                >
                  <Image
                    src={gift.image_url || "/placeholder.svg"}
                    alt={gift.name}
                    width={64}
                    height={64}
                    className="mb-2"
                  />
                  <h3 className="text-lg font-semibold text-white">{gift.name}</h3>
                  <p className="text-sm text-gray-400">{gift.description}</p>
                  <p className="text-md font-bold text-green-400 mt-1">{gift.value} TON</p>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-400">Подарки не найдены.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGiftSelection(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={confirmGiftSelection}
              disabled={!selectedGift}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <nav className="bottom-navigation bg-gradient-to-t from-[#1a1a1a] to-[#0a0a0a] border-t border-gray-700">
        <div className={`nav-item ${activeNav === "pvp" ? "active" : ""}`} onClick={() => setActiveNav("pvp")}>
          <Image src="/images/pvp-icon.png" alt="PvP" width={24} height={24} />
          <span>PvP</span>
        </div>
        <div className={`nav-item ${activeNav === "gifts" ? "active" : ""}`} onClick={handleGiftSelection}>
          <Image src="/images/gifts-icon.png" alt="Gifts" width={24} height={24} />
          <span>Подарки</span>
        </div>
        <div className={`nav-item ${activeNav === "earn" ? "active" : ""}`} onClick={() => setActiveNav("earn")}>
          <Image src="/images/earn-icon.png" alt="Earn" width={24} height={24} />
          <span>Заработать</span>
        </div>
      </nav>
    </div>
  )
}
