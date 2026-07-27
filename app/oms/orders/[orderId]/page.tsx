import Link from "next/link"
import { ORDERS, ORDER_STATUS_META, getChannel, orderTotal } from "../../data"
import { cn } from "@/lib/utils"

export function generateStaticParams() {
  return ORDERS.map((order) => ({ orderId: order.id }))
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const order = ORDERS.find((o) => o.id === orderId)

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">주문을 찾을 수 없습니다</p>
        <Link
          href="/oms/orders"
          className="mt-4 inline-block text-sm text-teal-700 hover:underline"
        >
          주문 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const channel = getChannel(order.channel)
  const statusMeta = ORDER_STATUS_META[order.status]

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link href="/oms/orders" className="text-sm text-slate-500 hover:text-slate-800">
        ← 주문 목록
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">{order.id}</h1>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.badge)}>
          {statusMeta.label}
        </span>
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">주문 정보</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">주문번호</dt>
          <dd className="text-slate-800">{order.id}</dd>
          <dt className="text-slate-500">채널</dt>
          <dd className="flex items-center gap-1.5 text-slate-800">
            <span className={cn("size-2 rounded-full", channel.dotColor)} />
            {channel.label}
          </dd>
          <dt className="text-slate-500">거래처</dt>
          <dd className="text-slate-800">{order.partner}</dd>
          <dt className="text-slate-500">주문일시</dt>
          <dd className="text-slate-800">{order.orderedAt}</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">수취인·배송지</h2>
          {order.addressChanged && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              배송지 변경됨
            </span>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">수취인</dt>
          <dd className="text-slate-800">{order.customer}</dd>
          <dt className="text-slate-500">연락처</dt>
          <dd className="text-slate-800">{order.phone}</dd>
          <dt className="text-slate-500">주소</dt>
          <dd className="col-span-1 text-slate-800">{order.address}</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">상품 항목</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="text-slate-800">{item.name}</p>
                {item.option && <p className="text-xs text-slate-400">{item.option}</p>}
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <span className="tabular-nums">{item.quantity}개</span>
                <span className="tabular-nums">{item.price.toLocaleString()}원</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">결제</h2>
          <p className="text-lg font-bold tabular-nums text-slate-900">
            {orderTotal(order).toLocaleString()}원
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">처리 이력</h2>
        <ol className="mt-3 space-y-3">
          {order.timeline.map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-teal-700" />
              <div>
                <p className="font-medium text-slate-800">{t.status}</p>
                <p className="text-xs text-slate-400">
                  {t.at}
                  {t.by ? ` · ${t.by}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <details className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          채널 원본 데이터
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(order, null, 2)}
        </pre>
      </details>
    </div>
  )
}
