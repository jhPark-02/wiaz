"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import FilterDropdown from "../_components/filter-dropdown"
import {
  CLAIMS,
  CHANNELS,
  CLAIM_TYPE_META,
  CLAIM_STATUS_META,
  ORDERS,
  getChannel,
  type ClaimType,
  type ClaimStatus,
} from "../data"

const TYPE_TABS: { label: string; value: ClaimType }[] = [
  { label: "취소", value: "cancel" },
  { label: "반품", value: "return" },
  { label: "교환", value: "exchange" },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "전체 상태" },
  { value: "requested", label: "요청" },
  { value: "collecting", label: "수거중" },
  { value: "completed", label: "완료" },
]

export default function ClaimsView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const channelParam = searchParams.get("channel") ?? "ALL"
  const statusParam = searchParams.get("status") ?? "ALL"
  const typeParam = searchParams.get("type") ?? ""

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const baseFiltered = useMemo(() => {
    return CLAIMS.filter((c) => {
      if (channelParam !== "ALL" && c.channel !== channelParam) return false
      if (statusParam !== "ALL" && c.status !== (statusParam as ClaimStatus))
        return false
      return true
    })
  }, [channelParam, statusParam])

  const typeFiltered = useMemo(() => {
    if (!typeParam) return baseFiltered
    return baseFiltered.filter((c) => c.type === typeParam)
  }, [baseFiltered, typeParam])

  const orderIds = useMemo(() => new Set(ORDERS.map((o) => o.id)), [])

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-xl font-bold text-slate-900">클레임</h1>
      <p className="mt-1 text-sm text-slate-500">
        취소·반품·교환 요청을 한 화면에서 조회합니다.
      </p>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => updateParams({ type: null })}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            typeParam === ""
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          전체
          <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500">
            {baseFiltered.length}
          </span>
        </button>
        {TYPE_TABS.map((tab) => {
          const active = typeParam === tab.value
          const count = baseFiltered.filter((c) => c.type === tab.value).length
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => updateParams({ type: tab.value })}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-teal-700 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterDropdown
          value={channelParam}
          placeholder="채널 전체"
          options={[
            { value: "ALL", label: "전체 채널" },
            ...CHANNELS.map((c) => ({ value: c.value, label: c.label })),
          ]}
          onChange={(v) => updateParams({ channel: v === "ALL" ? null : v })}
        />
        <FilterDropdown
          value={statusParam}
          placeholder="상태"
          options={STATUS_OPTIONS}
          onChange={(v) => updateParams({ status: v === "ALL" ? null : v })}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>채널</TableHead>
              <TableHead>클레임유형</TableHead>
              <TableHead>주문번호</TableHead>
              <TableHead>주문자</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>요청일자</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typeFiltered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  조건에 맞는 클레임이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {typeFiltered.map((c) => {
              const channel = getChannel(c.channel)
              const typeMeta = CLAIM_TYPE_META[c.type]
              const statusMeta = CLAIM_STATUS_META[c.status]
              const hasOrder = orderIds.has(c.orderId)
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          channel.dotColor,
                        )}
                      />
                      <span className="text-slate-700">{channel.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        typeMeta.badge,
                      )}
                    >
                      {typeMeta.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {hasOrder ? (
                      <Link
                        href={`/oms/orders/${c.orderId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {c.orderId}
                      </Link>
                    ) : (
                      <span className="text-slate-400">{c.orderId}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-700">{c.customer}</TableCell>
                  <TableCell className="max-w-48 truncate text-slate-700">
                    {c.product}
                  </TableCell>
                  <TableCell className="text-slate-600">{c.reason}</TableCell>
                  <TableCell className="text-slate-600">
                    {statusMeta.label}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {c.requestedAt}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
