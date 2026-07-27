"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChannelValue, getChannel, ORDERS } from "../../data"

export default function PreviewStep({
  orderIds,
  onConfirm,
}: {
  orderIds: string[]
  onConfirm: (count: number) => void
}) {
  // 넘어온 주문들을 채널별로 묶어서 "각 채널에 이만큼 전송" 보여주기
  const { channelGroups, total } = useMemo(() => {
    const targets =
      orderIds.length > 0
        ? ORDERS.filter((o) => orderIds.includes(o.id))
        : ORDERS.filter((o) => o.canShip) // 데모 fallback

    const map = new Map<ChannelValue, number>()
    for (const o of targets) {
      map.set(o.channel, (map.get(o.channel) ?? 0) + 1)
    }
    const groups = Array.from(map.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)

    return { channelGroups: groups, total: targets.length }
  }, [orderIds])

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-900">
        송장 {total}건을 {channelGroups.length}개 채널에 등록합니다
      </p>
      <p className="mt-1 text-sm text-slate-500">
        각 채널에 송장번호가 전송되며, 전송 후 구매자에게 배송 정보가 실시간으로
        노출됩니다.
      </p>

      {/* 채널별 전송 건수 */}
      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {channelGroups.map(({ channel, count }) => {
          const ch = getChannel(channel)
          return (
            <div
              key={channel}
              className="flex items-center gap-2.5 px-4 py-2.5"
            >
              <span
                className={cn("size-2 shrink-0 rounded-full", ch.dotColor)}
              />
              <span className="flex-1 text-sm text-slate-700">{ch.label}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-800">
                {count}건
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={() => onConfirm(total)} disabled={total === 0}>
          {total}건 채널에 전송
        </Button>
      </div>
    </div>
  )
}
