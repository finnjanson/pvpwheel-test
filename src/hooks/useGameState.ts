"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface GameState {
  status: "idle" | "waiting" | "active" | "completed"
  gameId?: string
  player1Id?: string
  player2Id?: string
  rollNumber?: number
  winnerId?: string
}

interface SpinResult {
  rotation: number
  value: number | null
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>({ status: "idle" })
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinResult, setSpinResult] = useState<SpinResult>({ rotation: 0, value: null })
  const [timeRemaining, setTimeRemaining] = useState(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const startTimer = useCallback((createdAt: string) => {
    const createdTime = new Date(createdAt).getTime()
    startTimeRef.current = createdTime
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || createdTime)
      const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000)) // 60 seconds countdown
      setTimeRemaining(remaining)
      if (remaining === 0) {
        clearInterval(timerIntervalRef.current!)
        // Optionally, trigger game cancellation if timer runs out
      }
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    stopTimer()
    setTimeRemaining(0)
    startTimeRef.current = null
  }, [stopTimer])

  const spinWheel = useCallback(
    (targetRoll: number, onComplete: () => void) => {
      setIsSpinning(true)
      // Calculate rotation for the target number (1-100)
      // Assuming 10 segments, each 36 degrees.
      // We want to land on a specific number. Let's simplify for now.
      // A full spin is 360 degrees. To make it land on a specific number,
      // we need to map the targetRoll (1-100) to a degree.
      // (targetRoll / 100) * 360
      // Add multiple full rotations to make it look like a spin
      const baseRotation = spinResult.rotation % 360 // Keep current rotation within 0-359
      const targetDegree = (targetRoll / 100) * 360
      const newRotation = baseRotation + 360 * 5 + (360 - targetDegree) // 5 full spins + land on target

      setSpinResult({ rotation: newRotation, value: null }) // Value will be set after spin

      setTimeout(() => {
        setIsSpinning(false)
        setSpinResult((prev) => ({ ...prev, value: targetRoll }))
        onComplete()
      }, 4000) // Match CSS transition duration
    },
    [spinResult.rotation],
  )

  const resetWheel = useCallback(() => {
    setSpinResult({ rotation: 0, value: null })
    setIsSpinning(false)
  }, [])

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  return {
    gameState,
    setGameState,
    spinWheel,
    resetWheel,
    isSpinning,
    spinResult,
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer,
  }
}
