import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSession, eventToLog, history, listSessions, prompt,
  type DriverLogLine,
} from '@/api/dsh'

export type DriverStatus = 'idle' | 'connecting' | 'ready' | 'running' | 'done' | 'error'

/** 交付流程的六个阶段（用于面板展示，驱动逐阶段推进）。 */
export const DELIVERY_STAGES = ['需求', '方案', '开发', '测试', '发布', '复盘'] as const

const POLL_MS = 1500

/**
 * 驱动 dsh 后端跑交付流程的 hook：
 *   connect() 探测后端是否可达；
 *   start(cwd, task) 开新会话 → 发任务 prompt → 轮询 history 把 agent 执行流读回。
 * 会话与 agent 都在后端（3080 的 dsh 实例）上运行，前端只是指挥台。
 */
export function useDeliveryDriver() {
  const [status, setStatus] = useState<DriverStatus>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DriverLogLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionCount, setSessionCount] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSeqRef = useRef(0)
  const tickCountRef = useRef(0)

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    try {
      const { items } = await listSessions()
      setSessionCount(items.length)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [])

  const start = useCallback(async (cwd: string, task: string) => {
    setStatus('running')
    setError(null)
    setLogs([])
    setSessionId(null)
    lastSeqRef.current = 0
    tickCountRef.current = 0
    try {
      const created = await createSession({ cwd })
      setSessionId(created.sessionId)
      await prompt(created.sessionId, task)

      const sid = created.sessionId
      const tick = async () => {
        tickCountRef.current += 1
        try {
          const page = await history(sid, { maxMessages: 3 })
          const fresh = page.events.filter(e => e.event.seq > lastSeqRef.current)
          if (fresh.length) {
            lastSeqRef.current = Math.max(lastSeqRef.current, ...fresh.map(e => e.event.seq))
            setLogs(prev => [...prev, ...fresh.flatMap(eventToLog)])
          }
          // 第二次 tick 起才判定结束：running 变 false 表示 agent 已跑完当前 turn。
          if (tickCountRef.current > 1) {
            const { items } = await listSessions()
            const sess = items.find(s => s.sessionId === sid)
            if (sess && !sess.running) {
              stopPolling()
              setStatus('done')
            }
          }
        } catch {
          // 单次轮询失败不断流，下一轮重试。
        }
      }
      await tick()
      timerRef.current = setInterval(tick, POLL_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [stopPolling])

  const stop = useCallback(() => {
    stopPolling()
    setStatus(prev => (prev === 'running' ? 'done' : prev))
  }, [stopPolling])

  return { status, sessionId, logs, error, sessionCount, connect, start, stop }
}
