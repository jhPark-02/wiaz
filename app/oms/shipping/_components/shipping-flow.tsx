"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import UploadStep from "./upload-step"
import PreviewStep from "./preview-step"
import DoneStep from "./done-step"

type Step = "upload" | "preview" | "done"

export default function ShippingFlow() {
  const searchParams = useSearchParams()
  const ordersParam = searchParams.get("orders") ?? ""
  const orderCount = ordersParam
    ? ordersParam.split(",").filter(Boolean).length
    : 0
  const orderIds = ordersParam ? ordersParam.split(",").filter(Boolean) : []

  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [confirmedCount, setConfirmedCount] = useState(0)

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="mb-6 text-xl font-bold text-slate-900">송장 업로드</h1>

      {step === "upload" && (
        <UploadStep
          orderCount={orderCount}
          fileName={fileName}
          onFileSelected={setFileName}
          onValidate={() => setStep("preview")}
        />
      )}
      {step === "preview" && (
        <PreviewStep
          orderIds={orderIds}
          onConfirm={(count) => {
            setConfirmedCount(count)
            setStep("done")
          }}
        />
      )}
      {step === "done" && (
        <DoneStep
          count={confirmedCount}
          onReset={() => {
            setFileName("")
            setStep("upload")
          }}
        />
      )}
      <div className="mt-5 space-y-1.5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p>
          업로드한 송장 정보는 각 채널이 요구하는 형식에 맞춰 자동으로 변환되어
          전송됩니다.
        </p>
        <p className="text-slate-400">
          ※ 현재 화면은 예시이며, 실제 송장 파일 양식을 전달받으면 해당 양식에
          맞춰 처리합니다.
        </p>
      </div>
    </div>
  )
}
