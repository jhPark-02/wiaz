"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DoneStep({
  count,
  onReset,
}: {
  count: number
  onReset: () => void
}) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200">
      {loading ? (
        <>
          <Loader2 className="mx-auto size-6 animate-spin text-teal-700" />
          <p className="mt-3 text-sm text-slate-500">발송처리를 진행하고 있습니다...</p>
        </>
      ) : (
        <>
          <p className="text-base font-semibold text-slate-900">
            {count}건 발송처리가 완료되었습니다
          </p>
          <Button className="mt-5" onClick={onReset}>
            새 업로드
          </Button>
        </>
      )}
    </div>
  )
}
