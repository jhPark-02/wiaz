"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function UploadStep({
  orderCount,
  fileName,
  onFileSelected,
  onValidate,
}: {
  orderCount: number
  fileName: string
  onFileSelected: (name: string) => void
  onValidate: () => void
}) {
  const handleValidate = () => {
    if (!fileName) {
      toast.error("파일을 선택해주세요")
      return
    }
    onValidate()
  }

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      {orderCount > 0 && (
        <p className="mb-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          선택한 주문 {orderCount}건에 대한 송장 파일을 업로드합니다.
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">송장 파일</span>
        <Input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => onFileSelected(e.target.files?.[0]?.name ?? "")}
        />
      </label>

      {fileName && (
        <p className="mt-2 text-sm text-slate-500">선택된 파일: {fileName}</p>
      )}

      <Button className="mt-5" onClick={handleValidate}>
        검증하기
      </Button>
    </div>
  )
}
