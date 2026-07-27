"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ORDERS,
  CLAIMS,
  CONN_META,
  getDashboardKpis,
  getPipeline,
  getChannelStats,
} from "./data"

import { ArrowRight } from "lucide-react"

// ---------------------------------------------------------------------------
// 상단 KPI — 현황 지표(봐야 할 것). 조용하게, 무채색 기준.
// ---------------------------------------------------------------------------
const kpis = getDashboardKpis()
const KPI_CARDS = [
  { key: "collectedToday", label: "오늘 수집", value: kpis.collectedToday },
  { key: "totalStored", label: "이번 주 누적 주문", value: kpis.totalStored },
  { key: "shippedToday", label: "오늘 발송", value: kpis.shippedToday },
  { key: "unhandled", label: "미처리", value: kpis.unhandled },
] as const

// ---------------------------------------------------------------------------
// 처리 카드 — 할 일(눌러서 이동). 건수 있으면 또렷, 0이면 물러남.
// tone: 값>0일 때만 색이 붙는다. 색은 주의가 필요할 때만.
// ---------------------------------------------------------------------------
type Tone = "neutral" | "warn" | "alert"
const TASK_CARDS: {
  label: string
  href: string
  count: number
  tone: Tone
}[] = [
  {
    label: "신규주문",
    href: "/wiaz/orders?status=new",
    count: ORDERS.filter((o) => o.status === "new").length,
    tone: "neutral",
  },
  {
    label: "발송지연",
    href: "/wiaz/orders?status=delayed",
    count: ORDERS.filter((o) => o.status === "delayed").length,
    tone: "warn",
  },
  {
    label: "클레임",
    href: "/wiaz/claims",
    count: CLAIMS.length,
    tone: "alert",
  },
  {
    label: "전송실패",
    href: "/wiaz/orders?status=sync_failed",
    count: ORDERS.filter((o) => o.status === "sync_failed").length,
    tone: "warn",
  },
]

// 값이 0이면 tone 무시하고 회색으로 (주의가 필요 없으니 물러남)
function taskStyle(tone: Tone, count: number) {
  if (count === 0) {
    return {
      countText: "text-slate-300",
      accent: "",
    }
  }
  switch (tone) {
    case "alert":
      return { countText: "text-red-600", accent: "bg-red-500" }
    case "warn":
      return { countText: "text-amber-600", accent: "bg-amber-500" }
    default:
      return { countText: "text-slate-900", accent: "bg-slate-300" }
  }
}

const pipeline = getPipeline()
const channelStats = getChannelStats()
const pipelineMax = Math.max(...pipeline.map((s) => s.count), 1)
const channelMax = Math.max(...channelStats.map((s) => s.orderCount), 1)

// 파이프라인 막대 색 — 진행=파랑 계열, 주의=주황 계열 (상태 색 규칙과 일치)
const STAGE_BAR: Record<string, string> = {
  new: "bg-slate-300",
  confirmed: "bg-blue-300",
  preparing: "bg-blue-400",
  shipping: "bg-blue-500",
  delayed: "bg-amber-400",
  sync_failed: "bg-amber-500",
}

export default function WiazDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            오늘 처리할 항목과 채널 수집 현황
          </p>
        </div>
      </header>

      {/* ── 현황 지표: 조용한 무채색. 봐야 할 것 ── */}
      <section className="mt-8">
        <Card>
          <CardContent className="grid grid-cols-2 divide-slate-100 p-0 sm:grid-cols-4 sm:divide-x">
            {KPI_CARDS.map((k, i) => (
              <div
                key={k.key}
                className={cn(
                  "px-6 py-5",
                  i < 2 && "border-b border-slate-100 sm:border-b-0",
                )}
              >
                <p className="text-sm text-slate-500">{k.label}</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-slate-900">
                  {k.value.toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ── 할 일: 클릭 대상. 색은 건수 있을 때만 ── */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">처리 대기</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TASK_CARDS.map((card) => {
            const s = taskStyle(card.tone, card.count)
            return (
              <Link key={card.label} href={card.href} className="group">
                <Card className="relative overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm">
                  {/* 왼쪽 액센트 바 — 주의가 필요할 때만 색 */}
                  {s.accent && (
                    <span
                      className={cn("absolute inset-y-0 left-0 w-1", s.accent)}
                    />
                  )}
                  <CardContent className="flex items-center justify-between py-4 pl-5 pr-4">
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {card.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-2xl font-bold tabular-nums",
                          s.countText,
                        )}
                      >
                        {card.count}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── 하단 2단: 처리 흐름 + 채널별 수집 ── */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 처리 흐름 — 진행중 주문 단계 분포 */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            처리 흐름
          </h2>
          <Card>
            <CardContent className="space-y-1 p-3">
              {pipeline.map((stage) => (
                <Link
                  key={stage.status}
                  href={`/wiaz/orders?status=${stage.status}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
                >
                  <span className="w-16 shrink-0 text-sm text-slate-600">
                    {stage.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        STAGE_BAR[stage.status],
                      )}
                      style={{ width: `${(stage.count / pipelineMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
                    {stage.count}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 채널별 수집 현황 */}
        <section className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            채널별 수집 현황
          </h2>
          <Card>
            <CardContent className="divide-y divide-slate-50 p-0">
              {channelStats.map((ch) => {
                const meta = CONN_META[ch.status]
                const keyWarn =
                  ch.keyExpiresInDays !== null && ch.keyExpiresInDays <= 30
                return (
                  <div
                    key={ch.value}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <span
                      className={cn("size-1.5 shrink-0 rounded-full", meta.dot)}
                    />
                    <span className="w-24 shrink-0 text-sm text-slate-700">
                      {ch.label}
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full", ch.dotColor)}
                        style={{
                          width: `${(ch.orderCount / channelMax) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
                      {ch.orderCount}
                    </span>
                    {/* 부가 표시: 클레임/키만료는 있을 때만 */}
                    <div className="flex w-16 shrink-0 items-center justify-end gap-1.5">
                      {ch.claimCount > 0 && (
                        <span className="text-xs font-medium text-red-500">
                          CS {ch.claimCount}
                        </span>
                      )}
                      {keyWarn && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                          D-{ch.keyExpiresInDays}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
