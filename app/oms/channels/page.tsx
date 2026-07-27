"use client"

import { cn } from "@/lib/utils"
import { CHANNELS, CHANNEL_CONNECTIONS, CONN_META } from "../data"

export default function ChannelsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-xl font-bold text-slate-900">채널 연동</h1>
      <p className="mt-1 text-sm text-slate-500">채널별 연동 상태입니다.</p>

      <section className="mt-6">
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2.5 font-medium">채널</th>
                <th className="px-4 py-2.5 font-medium">연동 상태</th>
                <th className="px-4 py-2.5 font-medium">키 만료</th>
                <th className="px-4 py-2.5 font-medium">마지막 동기화</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CHANNELS.map((ch) => {
                const conn = CHANNEL_CONNECTIONS[ch.value]
                const meta = CONN_META[conn.status]
                const keyWarn =
                  conn.keyExpiresInDays !== null && conn.keyExpiresInDays <= 30
                return (
                  <tr key={ch.value}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {ch.label}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className={cn("size-2 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {conn.keyExpiresInDays !== null ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            keyWarn
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          D-{conn.keyExpiresInDays}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {conn.lastSyncedAt ?? "-"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
