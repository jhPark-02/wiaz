"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChartPie,
  ListUnordered,
  CircleWarning,
  FileUpload,
  Settings,
  Exit,
} from "react-coolicons"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/auth"
import logo from "./wiaz_logo.png"

// 메뉴를 그룹으로 — 상단은 일상 업무, 하단은 설정. 위계가 생겨 스캔이 쉬워진다.
const NAV_GROUPS: {
  heading?: string
  items: {
    href: string
    label: string
    icon: typeof ChartPie
    exact?: boolean
  }[]
}[] = [
  {
    items: [{ href: "/wiaz", label: "대시보드", icon: ChartPie, exact: true }],
  },
  {
    heading: "주문 관리",
    items: [
      { href: "/wiaz/orders", label: "주문 목록", icon: ListUnordered },
      { href: "/wiaz/claims", label: "클레임", icon: CircleWarning },
      { href: "/wiaz/shipping", label: "송장 업로드", icon: FileUpload },
    ],
  },
  {
    heading: "설정",
    items: [{ href: "/wiaz/channels", label: "채널 현황", icon: Settings }],
  },
]

export default function WiazLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-teal-800 text-white">
        {/* 로고 */}
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <Image src={logo} alt="위아즈" className="h-7 w-auto" />
          <span className="text-sm font-semibold tracking-tight text-white">
            통합 주문 관리
          </span>
        </div>
        {/* 내비게이션 (그룹별) */}
        <nav className="flex flex-1 flex-col gap-5 px-3 py-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {group.heading && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-300/80">
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/15 font-semibold text-white"
                        : "font-medium text-teal-100/90 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        {/* 프로필 */}
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            홍
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">홍길동</p>
            <p className="truncate text-xs text-teal-200/80">운영 관리자</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            title="로그아웃"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-teal-200/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Exit className="size-[18px]" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-slate-50">{children}</main>
    </div>
  )
}
