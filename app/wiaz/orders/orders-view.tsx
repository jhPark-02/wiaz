"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { TriangleWarning } from "react-coolicons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"
import FilterDropdown from "../_components/filter-dropdown"
import {
  ORDERS,
  CHANNELS,
  ORDER_STATUS_META,
  ORDER_STATUS_TABS,
  getChannel,
  orderTotal,
  type Order,
} from "../data"

const FULFILLMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "SELLER", label: "셀러발송" },
  { value: "FULFILLMENT", label: "풀필먼트" },
]

type TabTone = "neutral" | "warn" | "alert"

interface ConfirmResult {
  success: Order[]
  failed: { order: Order; reason: string }[]
}

export default function OrdersView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<Order[]>(ORDERS)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ConfirmResult | null>(null)

  const [sendOpen, setSendOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const channelParam = searchParams.get("channel") ?? "ALL"
  const statusParam = searchParams.get("status") ?? ""
  const fulfillmentParam = searchParams.get("fulfillment") ?? "SELLER"
  const dateParam = searchParams.get("date") ?? ""

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 채널·발송주체·날짜 필터 (상태 탭 카운트의 기준)
  const baseFiltered = useMemo(() => {
    return orders.filter((o) => {
      if (channelParam !== "ALL" && o.channel !== channelParam) return false
      if (fulfillmentParam !== "ALL" && o.fulfillmentType !== fulfillmentParam)
        return false
      if (dateParam && o.orderedAt.slice(0, 10) !== dateParam) return false
      return true
    })
  }, [orders, channelParam, fulfillmentParam, dateParam])

  // 상태 탭까지 적용된 실제 표시 목록
  const statusFiltered = useMemo(() => {
    if (!statusParam) return baseFiltered
    const statuses = statusParam.split(",")
    return baseFiltered.filter((o) => statuses.includes(o.status))
  }, [baseFiltered, statusParam])

  // "전체" + 각 상태 탭을 하나의 배열로. tone으로 주의 탭 구분.
  const tabs = useMemo(() => {
    const statusTabs = ORDER_STATUS_TABS.map((tab) => {
      let tone: TabTone = "neutral"
      if (tab.statuses.includes("sync_failed")) tone = "warn"
      else if (
        tab.statuses.some((s) =>
          ["cancelled", "returned", "exchanged"].includes(s),
        )
      )
        tone = "alert"
      return {
        label: tab.label,
        value: tab.statuses.join(","),
        count: baseFiltered.filter((o) => tab.statuses.includes(o.status))
          .length,
        tone,
      }
    })
    return [
      {
        label: "전체",
        value: "",
        count: baseFiltered.length,
        tone: "neutral" as TabTone,
      },
      ...statusTabs,
    ]
  }, [baseFiltered])

  // 카운트 뱃지 색: 0이면 흐리게, 주의 탭이면 색, 아니면 회색/active teal
  const countBadgeClass = (tone: TabTone, count: number, active: boolean) => {
    if (count === 0) return "bg-slate-50 text-slate-300"
    if (tone === "alert") return "bg-red-100 text-red-600"
    if (tone === "warn") return "bg-amber-100 text-amber-600"
    return active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
  }

  const allSelectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id)),
    [orders, selected],
  )

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allVisibleSelected =
    statusFiltered.length > 0 && statusFiltered.every((o) => selected.has(o.id))

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const o of statusFiltered) {
        if (checked) next.add(o.id)
        else next.delete(o.id)
      }
      return next
    })
  }

  const handleExcelDownload = () => {
    const rows = allSelectedOrders.map((o) => [
      o.id,
      getChannel(o.channel).label,
      o.fulfillmentType === "FULFILLMENT" ? "풀필먼트" : "셀러발송",
      o.customer,
      o.product,
      o.quantity,
      ORDER_STATUS_META[o.status].label,
      o.trackingNumber ?? "",
      orderTotal(o),
      o.orderedAt,
    ])
    downloadCsv(
      `wiaz-orders-${Date.now()}.csv`,
      [
        "주문번호",
        "채널",
        "발송주체",
        "주문자",
        "상품명",
        "수량",
        "상태",
        "송장번호",
        "결제금액",
        "주문일자",
      ],
      rows,
    )
  }

  const confirmTargets = allSelectedOrders.filter((o) => o.canConfirm)

  const handleOpenConfirm = () => {
    if (confirmTargets.length === 0) {
      toast.error("주문확인 대상이 없습니다")
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmProcess = () => {
    if (processing) return
    setProcessing(true)
    setTimeout(() => {
      // 데모: 대상 중 첫 건을 실패 처리, 나머지는 성공
      const failIndex = confirmTargets.length > 0 ? 0 : -1
      const failReason = "채널 응답 지연으로 처리에 실패했습니다"
      const success: Order[] = []
      const failed: { order: Order; reason: string }[] = []
      confirmTargets.forEach((o, i) => {
        if (i === failIndex) failed.push({ order: o, reason: failReason })
        else success.push(o)
      })

      if (success.length > 0) {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
        const successIds = new Set(success.map((o) => o.id))
        setOrders((prev) =>
          prev.map((o) =>
            successIds.has(o.id)
              ? {
                  ...o,
                  status: "confirmed",
                  canConfirm: false,
                  canShip: o.fulfillmentType === "SELLER",
                  timeline: [
                    ...o.timeline,
                    { status: "주문확인", at, by: "김운영" },
                  ],
                }
              : o,
          ),
        )
      }

      // 처리 후 실패 건만 다시 선택 (재시도 흐름)
      setSelected(new Set(failed.map((f) => f.order.id)))
      setResult({ success, failed })
      setProcessing(false)
      setConfirmOpen(false)
    }, 600)
  }

  // 택배사 발주 대상: 셀러 배송 + 확인/준비중 상태 (풀필먼트는 물류사가 발송하므로 제외)
  const shipTargets = allSelectedOrders.filter((o) => o.canShip)

  const handleOpenSend = () => {
    if (shipTargets.length === 0) {
      toast.error("발송 가능한 주문이 없습니다 (셀러 배송 주문만 대상)")
      return
    }
    setSendOpen(true)
  }

  const handleSendProcess = () => {
    if (sending) return
    setSending(true)
    // 데모: 실제 이메일 발송 없이 흐름만. 서버가 택배사 양식으로 변환해 발송하는 자리.
    setTimeout(() => {
      setSending(false)
      setSendOpen(false)
      toast.success(
        `${shipTargets.length}건의 배송 정보를 택배사로 발송 요청했습니다`,
      )
      setSelected(new Set())
    }, 700)
  }

  const notTargetCount = allSelectedOrders.length - confirmTargets.length

  return (
    <div className="mx-auto max-w-7xl px-8 py-8 pb-28">
      <h1 className="text-xl font-bold text-slate-900">주문 목록</h1>

      {/* 필터 바 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
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
          value={fulfillmentParam}
          placeholder="발송주체"
          options={FULFILLMENT_OPTIONS}
          onChange={(v) =>
            updateParams({ fulfillment: v === "SELLER" ? null : v })
          }
        />

        {/* 날짜 필터 — 특정 하루 선택. 값 없으면 전체 */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateParam}
            onChange={(e) => updateParams({ date: e.target.value || null })}
            className={cn(
              "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors",
              "hover:border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500",
              dateParam && "border-teal-300 text-teal-800",
            )}
            aria-label="주문일자 선택"
          />
          {dateParam && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams({ date: null })}
              className="h-9 px-2 hover:text-slate-700"
              aria-label="날짜 필터 해제"
            >
              <div>초기화</div>
            </Button>
          )}
        </div>
      </div>

      {/* 상태 탭 */}
      <div className="mt-5 flex flex-wrap gap-0.5 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = statusParam === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => updateParams({ status: tab.value || null })}
              className={cn(
                "relative flex items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-sm transition-colors",
                active
                  ? "font-semibold text-teal-800"
                  : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums transition-colors",
                  countBadgeClass(tab.tone, tab.count, active),
                )}
              >
                {tab.count}
              </span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-700" />
              )}
            </button>
          )
        })}
      </div>

      {/* 테이블 */}
      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleAllVisible(e.target.checked)}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead>채널</TableHead>
              <TableHead>주문번호</TableHead>
              <TableHead>주문자</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">결제금액</TableHead>
              <TableHead>주문일자</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statusFiltered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  조건에 맞는 주문이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {statusFiltered.map((o) => {
              const channel = getChannel(o.channel)
              const statusMeta = ORDER_STATUS_META[o.status]
              const failed = o.syncStatus === "failed"
              return (
                <TableRow
                  key={o.id}
                  onClick={() => router.push(`/wiaz/orders/${o.id}`)}
                  className={cn(
                    "cursor-pointer",
                    failed && "bg-amber-50 hover:bg-amber-100",
                  )}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300"
                      checked={selected.has(o.id)}
                      onChange={(e) => toggleRow(o.id, e.target.checked)}
                      aria-label={`${o.id} 선택`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          channel.dotColor,
                        )}
                      />
                      <span className="text-slate-700">{channel.label}</span>
                      {o.fulfillmentType === "FULFILLMENT" && (
                        <Badge className="bg-violet-100 text-violet-700">
                          풀필먼트
                        </Badge>
                      )}
                      {failed && (
                        <TriangleWarning className="size-3.5 shrink-0 text-amber-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/wiaz/orders/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {o.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-700">{o.customer}</TableCell>
                  <TableCell className="max-w-56 truncate text-slate-700">
                    {o.product}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">
                    {o.quantity}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusMeta.badge,
                      )}
                    >
                      {statusMeta.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-900">
                    {orderTotal(o).toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {o.orderedAt}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* 일괄 작업 바 — 사이드바 폭(w-64 = 16rem)과 맞춤 */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-64 right-0 z-40 flex items-center gap-3 border-t border-slate-200 bg-white px-8 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <span className="text-sm font-medium text-slate-700">
            {selected.size}건 선택됨
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <Button variant="outline" size="sm" onClick={handleOpenConfirm}>
            주문확인
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSend}
            disabled={shipTargets.length === 0}
          >
            택배사 일괄 전송
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelDownload}>
            엑셀 다운로드
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* 주문확인 모달 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>주문확인 처리</DialogTitle>
            <DialogDescription>
              선택한 {allSelectedOrders.length}건 중 {confirmTargets.length}건을
              주문확인 처리합니다.
              {notTargetCount > 0 && (
                <>
                  {" "}
                  나머지 {notTargetCount}건은 대상이 아닙니다 (신규주문이
                  아니거나 풀필먼트 주문).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-1.5 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <p>⚠ 처리 후에는 되돌릴 수 없습니다.</p>
            <p>
              ⚠ 고객에게 &apos;배송준비중&apos; 알림이 발송되고, 구매자의 즉시
              취소가 제한됩니다.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={processing}
            >
              취소
            </Button>
            <Button onClick={handleConfirmProcess} disabled={processing}>
              {processing ? "처리 중..." : "주문확인 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 처리 결과 모달 */}
      <Dialog
        open={result !== null}
        onOpenChange={(open) => !open && setResult(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>처리 완료</DialogTitle>
            <DialogDescription>
              성공 {result?.success.length ?? 0}건 / 실패{" "}
              {result?.failed.length ?? 0}건
            </DialogDescription>
          </DialogHeader>

          {result && result.failed.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {result.failed.map((f) => (
                <p key={f.order.id}>
                  주문 {f.order.id} — {f.reason}
                </p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setResult(null)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>택배사 배송 정보 전송</DialogTitle>
            <DialogDescription>
              선택한 {allSelectedOrders.length}건 중 {shipTargets.length}건의
              배송 정보를 택배사에 이메일로 전송합니다.
              {allSelectedOrders.length - shipTargets.length > 0 && (
                <>
                  {" "}
                  나머지 {allSelectedOrders.length - shipTargets.length}건은
                  대상이 아닙니다 (풀필먼트 주문이거나 발송 단계가 아님).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* 전송될 정보 미리보기 */}
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">주문번호</th>
                  <th className="px-3 py-2 text-left font-medium">수취인</th>
                  <th className="px-3 py-2 text-left font-medium">상품</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipTargets.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 text-slate-700">{o.id}</td>
                    <td className="px-3 py-2 text-slate-700">{o.customer}</td>
                    <td className="max-w-40 truncate px-3 py-2 text-slate-500">
                      {o.product}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
            <p>
              수취인·주소·연락처·상품 정보가 택배사 양식으로 정리되어 지정된
              택배사 이메일로 발송됩니다.
            </p>
            <p className="text-slate-400">
              ※ 현재 화면은 예시이며, 실제 택배사 양식을 전달받으면 해당 양식에
              맞춰 정리해 발송합니다.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={sending}
            >
              취소
            </Button>
            <Button onClick={handleSendProcess} disabled={sending}>
              {sending ? "전송 중..." : "택배사로 전송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
