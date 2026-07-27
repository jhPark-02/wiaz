"use client"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { DEMO_ACCOUNT, login } from "@/lib/auth"
import logo from "./oms/wiaz_logo.png"

const INPUT =
  "h-auto rounded-lg border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus-visible:border-teal-700 focus-visible:ring-teal-800/10"

export default function WiazLoginPage() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!login(userId, password)) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.")
      return
    }

    setError("")
    router.push("/oms")
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-100">
          <div className="mb-8 inline-flex rounded-xl bg-teal-800 px-5 py-4 lg:hidden">
            <Image src={logo} alt="위아즈" className="h-8 w-auto" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            로그인
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            계정 정보를 입력해 주세요
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="userid"
                className="text-sm font-medium text-slate-700"
              >
                아이디
              </label>
              <Input
                id="userid"
                type="text"
                autoComplete="username"
                placeholder="아이디를 입력하세요"
                className={INPUT}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                className={INPUT}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 rounded-lg bg-teal-800 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-900"
            >
              로그인
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            데모 계정 — {DEMO_ACCOUNT.userId} / {DEMO_ACCOUNT.password}
          </p>
        </div>
      </div>
    </div>
  )
}
