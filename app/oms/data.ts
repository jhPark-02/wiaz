// 위아즈 OMS 데모 — 목데이터 (data.ts) v3
// 실제 API 연동 없음. 모든 데이터는 이 파일의 상수에서 나온다.
// 전제: 모든 채널의 API 승인이 완료됐다고 가정. 주문조회·배송정보·클레임조회·주문확인·송장업로드 5개 기능은 전부 정식.

export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "returned"
  | "exchanged"
  | "delayed"
  | "sync_failed"

export type FulfillmentType = "SELLER" | "FULFILLMENT"

export type ChannelValue =
  | "coupang"
  | "naver"
  | "gmarket"
  | "auction"
  | "eleven"
  | "kakao"
  | "toss"
  | "cafe24"
  | "temu"
  | "grip"

export type ClaimType = "cancel" | "return" | "exchange"
export type ClaimStatus = "requested" | "collecting" | "completed"

export interface OrderItem {
  name: string
  option?: string
  quantity: number
  price: number
}

export interface TimelineEntry {
  status: string
  at: string
  by?: string
}

export interface Order {
  id: string
  channel: ChannelValue
  partner: string
  customer: string
  phone: string
  address: string
  product: string
  quantity: number
  items: OrderItem[]
  status: OrderStatus
  trackingNumber?: string
  courier?: string
  orderedAt: string
  timeline: TimelineEntry[]

  fulfillmentType: FulfillmentType
  canConfirm: boolean
  canShip: boolean
  addressChanged?: boolean
  syncStatus: "success" | "pending" | "failed"
  syncFailReason?: string
}

// 클레임 (조회 전용) — ORDERS와 별개 배열. 일부는 실제 주문과 연결되고, 일부는 독립적인 과거 요청이다.
export interface Claim {
  id: string
  orderId: string
  channel: ChannelValue
  partner: string
  customer: string
  product: string
  type: ClaimType
  status: ClaimStatus
  reason: string
  requestedAt: string
}

// ---------------------------------------------------------------------------
// 채널 메타 (카카오 포함 10개)
// ---------------------------------------------------------------------------

export const CHANNELS: {
  value: ChannelValue
  label: string
  dotColor: string
}[] = [
  { value: "coupang", label: "쿠팡", dotColor: "bg-rose-500" },
  { value: "naver", label: "스마트스토어", dotColor: "bg-green-500" },
  { value: "gmarket", label: "G마켓", dotColor: "bg-emerald-600" },
  { value: "auction", label: "옥션", dotColor: "bg-red-600" },
  { value: "eleven", label: "11번가", dotColor: "bg-orange-500" },
  { value: "kakao", label: "카카오", dotColor: "bg-yellow-500" },
  { value: "toss", label: "토스쇼핑", dotColor: "bg-blue-500" },
  { value: "cafe24", label: "카페24", dotColor: "bg-slate-700" },
  { value: "temu", label: "테무", dotColor: "bg-amber-500" },
  { value: "grip", label: "그립", dotColor: "bg-fuchsia-500" },
]

export function getChannel(v: ChannelValue) {
  return CHANNELS.find((c) => c.value === v) ?? CHANNELS[0]
}

// ---------------------------------------------------------------------------
// 상태 메타 (색 규칙 고정: 초록=완료, 파랑=진행, 빨강=클레임/취소, 주황=주의)
// ---------------------------------------------------------------------------

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badge: string }
> = {
  new: { label: "신규주문", badge: "bg-slate-100 text-slate-700" },
  confirmed: { label: "주문확인", badge: "bg-blue-100 text-blue-700" },
  preparing: { label: "상품준비중", badge: "bg-blue-100 text-blue-700" },
  shipping: { label: "배송중", badge: "bg-blue-100 text-blue-700" },
  delivered: { label: "배송완료", badge: "bg-green-100 text-green-700" },
  cancelled: { label: "취소", badge: "bg-red-100 text-red-700" },
  returned: { label: "반품", badge: "bg-red-100 text-red-700" },
  exchanged: { label: "교환", badge: "bg-red-100 text-red-700" },
  delayed: { label: "발송지연", badge: "bg-amber-100 text-amber-700" },
  sync_failed: { label: "전송실패", badge: "bg-amber-100 text-amber-700" },
}

export const CLAIM_TYPE_META: Record<
  ClaimType,
  { label: string; badge: string }
> = {
  cancel: { label: "취소", badge: "bg-red-100 text-red-700" },
  return: { label: "반품", badge: "bg-orange-100 text-orange-700" },
  exchange: { label: "교환", badge: "bg-purple-100 text-purple-700" },
}

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string }> = {
  requested: { label: "요청" },
  collecting: { label: "수거중" },
  completed: { label: "완료" },
}

export const ORDER_STATUS_TABS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "신규주문", statuses: ["new"] },
  { label: "주문확인", statuses: ["confirmed"] },
  { label: "배송준비", statuses: ["preparing"] },
  { label: "배송중", statuses: ["shipping"] },
  { label: "배송완료", statuses: ["delivered"] },

  { label: "전송실패", statuses: ["sync_failed"] },
]

// ---------------------------------------------------------------------------
// 채널 연동 목데이터 (승인 완료 전제 — 대부분 connected)
// ---------------------------------------------------------------------------

export type ConnStatus = "connected" | "pending" | "not_connected"

export const CONN_META: Record<ConnStatus, { label: string; dot: string }> = {
  connected: { label: "연결됨", dot: "bg-green-500" },
  pending: { label: "승인 대기", dot: "bg-amber-500" },
  not_connected: { label: "미연결", dot: "bg-slate-300" },
}

export interface ChannelConn {
  status: ConnStatus
  lastSyncedAt: string | null
  keyExpiresInDays: number | null
}

export const CHANNEL_CONNECTIONS: Record<ChannelValue, ChannelConn> = {
  coupang: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:25",
    keyExpiresInDays: 45,
  },
  naver: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:22",
    keyExpiresInDays: null,
  },
  gmarket: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:20",
    keyExpiresInDays: null,
  },
  auction: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:20",
    keyExpiresInDays: null,
  },
  eleven: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:28",
    keyExpiresInDays: null,
  },
  kakao: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:18",
    keyExpiresInDays: null,
  },
  toss: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:15",
    keyExpiresInDays: null,
  },
  cafe24: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:30",
    keyExpiresInDays: null,
  },
  temu: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:10",
    keyExpiresInDays: null,
  },
  grip: {
    status: "connected",
    lastSyncedAt: "2026-07-27 14:12",
    keyExpiresInDays: null,
  },
}

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

export function orderTotal(o: Order) {
  return o.items.reduce((s, it) => s + it.price * it.quantity, 0)
}

function addMinutes(orderedAt: string, minutes: number) {
  const d = new Date(orderedAt.replace(" ", "T") + ":00")
  d.setMinutes(d.getMinutes() + minutes)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TIMELINE_TEMPLATES: Record<
  OrderStatus,
  { status: string; offsetMin: number; by: string }[]
> = {
  new: [
    { status: "주문접수", offsetMin: 0, by: "시스템" },
    { status: "결제완료", offsetMin: 3, by: "시스템" },
  ],
  confirmed: [
    { status: "주문접수", offsetMin: 0, by: "시스템" },
    { status: "결제완료", offsetMin: 3, by: "시스템" },
    { status: "주문확인", offsetMin: 95, by: "김운영" },
  ],
  preparing: [
    { status: "결제완료", offsetMin: 3, by: "시스템" },
    { status: "주문확인", offsetMin: 95, by: "김운영" },
    { status: "상품준비중", offsetMin: 260, by: "김운영" },
  ],
  shipping: [
    { status: "주문확인", offsetMin: 95, by: "김운영" },
    { status: "상품준비중", offsetMin: 260, by: "김운영" },
    { status: "배송시작", offsetMin: 520, by: "택배사" },
  ],
  delivered: [
    { status: "상품준비중", offsetMin: 260, by: "김운영" },
    { status: "배송시작", offsetMin: 520, by: "택배사" },
    { status: "배송완료", offsetMin: 1600, by: "택배사" },
  ],
  cancelled: [
    { status: "주문접수", offsetMin: 0, by: "시스템" },
    { status: "결제완료", offsetMin: 3, by: "시스템" },
    { status: "주문취소", offsetMin: 180, by: "고객" },
  ],
  returned: [
    { status: "배송완료", offsetMin: 1600, by: "택배사" },
    { status: "반품접수", offsetMin: 2200, by: "고객" },
  ],
  exchanged: [
    { status: "배송완료", offsetMin: 1600, by: "택배사" },
    { status: "교환접수", offsetMin: 2150, by: "고객" },
  ],
  delayed: [
    { status: "주문확인", offsetMin: 95, by: "김운영" },
    { status: "상품준비중", offsetMin: 260, by: "김운영" },
    { status: "발송지연", offsetMin: 600, by: "시스템" },
  ],
  sync_failed: [
    { status: "주문접수", offsetMin: 0, by: "시스템" },
    { status: "연동실패", offsetMin: 5, by: "시스템" },
  ],
}

const COURIERS = [
  "CJ대한통운",
  "한진택배",
  "롯데택배",
  "로젠택배",
  "우체국택배",
]

interface RawOrder {
  channel: ChannelValue
  partner: string
  customer: string
  phone: string
  address: string
  items: OrderItem[]
  status: OrderStatus
  fulfillmentType: FulfillmentType
  orderedAt: string
  addressChanged?: boolean
  syncFailReason?: string
}

const HAS_TRACKING: OrderStatus[] = [
  "shipping",
  "delivered",
  "returned",
  "exchanged",
]

const RAW_ORDERS: RawOrder[] = [
  {
    channel: "coupang",
    partner: "바디프로젝트",
    customer: "김민수",
    phone: "010-2841-5563",
    address: "서울특별시 강남구 테헤란로 123, 4층",
    items: [{ name: "웨이 프로틴 2kg", quantity: 1, price: 52000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 09:12",
  },
  {
    channel: "naver",
    partner: "일품미식",
    customer: "이서연",
    phone: "010-3312-7789",
    address: "부산광역시 해운대구 센텀중앙로 79",
    items: [{ name: "한우 선물세트 1호", quantity: 1, price: 98000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 08:41",
  },
  {
    channel: "gmarket",
    partner: "원시인",
    customer: "박지훈",
    phone: "010-9021-4456",
    address: "경기도 성남시 분당구 판교역로 231",
    items: [{ name: "캠핑 접이의자", quantity: 1, price: 33000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 10:20",
  },
  {
    channel: "auction",
    partner: "위아즈",
    customer: "최유진",
    phone: "010-4477-2210",
    address: "인천광역시 연수구 컨벤시아대로 165",
    items: [{ name: "무선 이어폰 프로", quantity: 1, price: 69000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 07:55",
  },
  {
    channel: "eleven",
    partner: "바디프로젝트",
    customer: "정승호",
    phone: "010-4471-2298",
    address: "대구광역시 수성구 동대구로 351",
    items: [{ name: "BCAA 파우더 300g", quantity: 2, price: 28000 }],
    status: "new",
    fulfillmentType: "FULFILLMENT",
    orderedAt: "2026-07-27 09:44",
  },
  {
    channel: "kakao",
    partner: "일품미식",
    customer: "한소희",
    phone: "0507-2456-8813",
    address: "경기도 수원시 영통구 광교로 145",
    items: [{ name: "즉석 갈비탕 6팩", quantity: 1, price: 35000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 11:02",
  },
  {
    channel: "toss",
    partner: "원시인",
    customer: "오태양",
    phone: "010-1123-9987",
    address: "서울특별시 송파구 올림픽로 300",
    items: [{ name: "저탄고지 도시락 5식", quantity: 1, price: 41000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 10:33",
  },
  {
    channel: "cafe24",
    partner: "위아즈",
    customer: "윤아름",
    phone: "010-7789-2231",
    address: "광주광역시 서구 상무중앙로 43",
    items: [{ name: "블루투스 스피커", quantity: 1, price: 38000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 11:15",
  },
  {
    channel: "temu",
    partner: "바디프로젝트",
    customer: "강도현",
    phone: "010-3345-8821",
    address: "대전광역시 유성구 대학로 291",
    items: [{ name: "요가매트 프로", quantity: 1, price: 39000 }],
    status: "shipping",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-25 09:50",
  },
  {
    channel: "grip",
    partner: "일품미식",
    customer: "임하은",
    phone: "010-5567-1120",
    address: "경기도 고양시 일산동구 중앙로 1206",
    items: [{ name: "프리미엄 돌김 세트", quantity: 2, price: 24000 }],
    status: "delayed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-25 14:20",
  },

  {
    channel: "coupang",
    partner: "원시인",
    customer: "조성민",
    phone: "010-2298-6674",
    address: "서울특별시 종로구 종로 33",
    items: [
      { name: "캠핑 접이의자", quantity: 2, price: 33000 },
      { name: "수제 훈제란 10구", quantity: 1, price: 16000 },
    ],
    status: "preparing",
    fulfillmentType: "FULFILLMENT",
    orderedAt: "2026-07-26 14:05",
    addressChanged: true,
  },
  {
    channel: "naver",
    partner: "위아즈",
    customer: "배수지",
    phone: "010-8845-2201",
    address: "경남 창원시 의창구 창이대로 542",
    items: [{ name: "고속충전 보조배터리", quantity: 1, price: 29000 }],
    status: "shipping",
    fulfillmentType: "FULFILLMENT",
    orderedAt: "2026-07-25 11:20",
  },
  {
    channel: "gmarket",
    partner: "바디프로젝트",
    customer: "신동욱",
    phone: "010-4432-9987",
    address: "울산광역시 남구 삼산로 108",
    items: [{ name: "폼롤러", quantity: 1, price: 22000 }],
    status: "new",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 12:40",
  },
  {
    channel: "auction",
    partner: "일품미식",
    customer: "황지민",
    phone: "010-1298-4456",
    address: "경기도 용인시 수지구 포은대로 435",
    items: [{ name: "한과 선물세트", quantity: 1, price: 32000 }],
    status: "confirmed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-26 16:40",
  },
  {
    channel: "eleven",
    partner: "원시인",
    customer: "문서준",
    phone: "010-6621-3345",
    address: "서울특별시 영등포구 여의대로 108",
    items: [{ name: "수제 훈제란 10구", quantity: 3, price: 16000 }],
    status: "preparing",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-26 11:33",
  },
  {
    channel: "kakao",
    partner: "위아즈",
    customer: "백지원",
    phone: "010-9987-2245",
    address: "부산광역시 부산진구 서면로 68",
    items: [{ name: "USB 미니 선풍기", quantity: 2, price: 14000 }],
    status: "preparing",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-26 09:12",
  },
  {
    channel: "toss",
    partner: "바디프로젝트",
    customer: "서동건",
    phone: "010-3321-7765",
    address: "경기도 부천시 원미구 길주로 210",
    items: [{ name: "웨이 프로틴 2kg", quantity: 1, price: 52000 }],
    status: "shipping",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-25 16:48",
  },
  {
    channel: "cafe24",
    partner: "일품미식",
    customer: "권나영",
    phone: "010-5543-8821",
    address: "서울특별시 서초구 강남대로 373",
    items: [{ name: "떡갈비 선물세트", quantity: 1, price: 45000 }],
    status: "preparing",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-26 08:12",
  },
  {
    channel: "temu",
    partner: "원시인",
    customer: "장현우",
    phone: "010-7712-4498",
    address: "전북 전주시 완산구 효자로 225",
    items: [{ name: "원목 도마", quantity: 1, price: 27000 }],
    status: "delivered",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-22 17:00",
  },
  {
    channel: "grip",
    partner: "위아즈",
    customer: "고은비",
    phone: "010-2287-6631",
    address: "서울특별시 강남구 테헤란로 123, 4층",
    items: [{ name: "휴대용 미니 가습기", quantity: 1, price: 23000 }],
    status: "sync_failed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 06:20",
    syncFailReason: "채널 인증 만료",
  },

  {
    channel: "coupang",
    partner: "바디프로젝트",
    customer: "양준혁",
    phone: "0504-1234-5678",
    address: "부산광역시 해운대구 센텀중앙로 79",
    items: [{ name: "헬스 스트랩", quantity: 1, price: 15000 }],
    status: "sync_failed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-27 06:48",
    syncFailReason: "일시적 오류",
  },
  {
    channel: "naver",
    partner: "일품미식",
    customer: "노유리",
    phone: "010-4456-2298",
    address: "경기도 성남시 분당구 판교역로 231",
    items: [{ name: "즉석 갈비탕 6팩", quantity: 2, price: 35000 }],
    status: "confirmed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-26 18:20",
  },
  {
    channel: "gmarket",
    partner: "원시인",
    customer: "안재현",
    phone: "010-8871-2245",
    address: "인천광역시 연수구 컨벤시아대로 165",
    items: [{ name: "저탄고지 도시락 5식", quantity: 1, price: 41000 }],
    status: "delayed",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-25 08:40",
  },
  {
    channel: "auction",
    partner: "위아즈",
    customer: "홍서율",
    phone: "010-3398-7712",
    address: "대구광역시 수성구 동대구로 351",
    items: [{ name: "USB 미니 선풍기", quantity: 1, price: 14000 }],
    status: "cancelled",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-24 19:30",
  },
  {
    channel: "eleven",
    partner: "바디프로젝트",
    customer: "류지안",
    phone: "010-6634-9921",
    address: "경기도 수원시 영통구 광교로 145",
    items: [{ name: "폼롤러", quantity: 1, price: 22000 }],
    status: "delivered",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-22 13:10",
  },
  {
    channel: "kakao",
    partner: "일품미식",
    customer: "전민재",
    phone: "010-2251-4487",
    address: "서울특별시 송파구 올림픽로 300",
    items: [{ name: "프리미엄 돌김 세트", quantity: 1, price: 24000 }],
    status: "returned",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-21 15:50",
  },
  {
    channel: "toss",
    partner: "원시인",
    customer: "차은우",
    phone: "010-7723-6698",
    address: "광주광역시 서구 상무중앙로 43",
    items: [{ name: "훈제 오리 육포", quantity: 1, price: 19000 }],
    status: "delivered",
    fulfillmentType: "FULFILLMENT",
    orderedAt: "2026-07-22 09:15",
  },
  {
    channel: "cafe24",
    partner: "위아즈",
    customer: "구자영",
    phone: "010-8867-3321",
    address: "대전광역시 유성구 대학로 291",
    items: [{ name: "블루투스 스피커", quantity: 1, price: 38000 }],
    status: "cancelled",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-25 15:22",
  },
  {
    channel: "temu",
    partner: "바디프로젝트",
    customer: "탁현서",
    phone: "010-4412-8876",
    address: "경기도 고양시 일산동구 중앙로 1206",
    items: [{ name: "BCAA 파우더 300g", quantity: 1, price: 28000 }],
    status: "returned",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-21 10:40",
  },
  {
    channel: "grip",
    partner: "일품미식",
    customer: "설아라",
    phone: "010-2298-5567",
    address: "서울특별시 종로구 종로 33",
    items: [{ name: "한우 선물세트 1호", quantity: 1, price: 98000 }],
    status: "exchanged",
    fulfillmentType: "SELLER",
    orderedAt: "2026-07-20 09:15",
  },
]

function buildOrder(raw: RawOrder, index: number): Order {
  const seq = String(index + 1).padStart(3, "0")
  const id = `2026${raw.orderedAt.slice(5, 7)}${raw.orderedAt.slice(8, 10)}-${seq}`
  const timeline: TimelineEntry[] = TIMELINE_TEMPLATES[raw.status].map((t) => ({
    status: t.status,
    at: addMinutes(raw.orderedAt, t.offsetMin),
    by: t.by,
  }))
  const quantity = raw.items.reduce((s, it) => s + it.quantity, 0)
  const canConfirm = raw.status === "new" && raw.fulfillmentType === "SELLER"
  const canShip =
    (raw.status === "confirmed" || raw.status === "preparing") &&
    raw.fulfillmentType === "SELLER"

  const withTracking = HAS_TRACKING.includes(raw.status)

  return {
    id,
    channel: raw.channel,
    partner: raw.partner,
    customer: raw.customer,
    phone: raw.phone,
    address: raw.address,
    product:
      raw.items[0].name +
      (raw.items.length > 1 ? ` 외 ${raw.items.length - 1}건` : ""),
    quantity,
    items: raw.items,
    status: raw.status,
    trackingNumber: withTracking ? `${1000000000 + index * 137}` : undefined,
    courier: withTracking ? COURIERS[index % COURIERS.length] : undefined,
    orderedAt: raw.orderedAt,
    timeline,
    fulfillmentType: raw.fulfillmentType,
    canConfirm,
    canShip,
    addressChanged: raw.addressChanged,
    syncStatus: raw.syncFailReason ? "failed" : "success",
    syncFailReason: raw.syncFailReason,
  }
}

export const ORDERS: Order[] = RAW_ORDERS.map(buildOrder)

// ---------------------------------------------------------------------------
// 클레임 (조회 전용, 9건) — 5건은 위 ORDERS의 클레임 상태 주문과 연결, 4건은 독립적인 과거 요청
// ---------------------------------------------------------------------------

function findOrder(channel: ChannelValue, customer: string): Order {
  const o = ORDERS.find(
    (order) => order.channel === channel && order.customer === customer,
  )
  if (!o) throw new Error(`claim seed order not found: ${channel} ${customer}`)
  return o
}

const linkedCancel1 = findOrder("auction", "홍서율")
const linkedCancel2 = findOrder("cafe24", "구자영")
const linkedReturn1 = findOrder("kakao", "전민재")
const linkedReturn2 = findOrder("temu", "탁현서")
const linkedExchange1 = findOrder("grip", "설아라")

export const CLAIMS: Claim[] = [
  {
    id: "CLM-2607-001",
    orderId: linkedCancel1.id,
    channel: linkedCancel1.channel,
    partner: linkedCancel1.partner,
    customer: linkedCancel1.customer,
    product: linkedCancel1.product,
    type: "cancel",
    status: "completed",
    reason: "단순 변심",
    requestedAt: "2026-07-24 20:10",
  },
  {
    id: "CLM-2607-002",
    orderId: linkedCancel2.id,
    channel: linkedCancel2.channel,
    partner: linkedCancel2.partner,
    customer: linkedCancel2.customer,
    product: linkedCancel2.product,
    type: "cancel",
    status: "requested",
    reason: "오배송",
    requestedAt: "2026-07-25 16:05",
  },
  {
    id: "CLM-2607-003",
    orderId: linkedReturn1.id,
    channel: linkedReturn1.channel,
    partner: linkedReturn1.partner,
    customer: linkedReturn1.customer,
    product: linkedReturn1.product,
    type: "return",
    status: "collecting",
    reason: "상품 불량",
    requestedAt: "2026-07-22 09:40",
  },
  {
    id: "CLM-2607-004",
    orderId: linkedReturn2.id,
    channel: linkedReturn2.channel,
    partner: linkedReturn2.partner,
    customer: linkedReturn2.customer,
    product: linkedReturn2.product,
    type: "return",
    status: "completed",
    reason: "단순 변심",
    requestedAt: "2026-07-22 11:15",
  },
  {
    id: "CLM-2607-005",
    orderId: linkedExchange1.id,
    channel: linkedExchange1.channel,
    partner: linkedExchange1.partner,
    customer: linkedExchange1.customer,
    product: linkedExchange1.product,
    type: "exchange",
    status: "requested",
    reason: "사이즈 교환",
    requestedAt: "2026-07-20 14:30",
  },
  {
    id: "CLM-2606-006",
    orderId: "20260615-014",
    channel: "coupang",
    partner: "바디프로젝트",
    customer: "이도윤",
    product: "웨이 프로틴 2kg",
    type: "cancel",
    status: "completed",
    reason: "단순 변심",
    requestedAt: "2026-06-16 10:20",
  },
  {
    id: "CLM-2606-007",
    orderId: "20260612-009",
    channel: "naver",
    partner: "일품미식",
    customer: "박서준",
    product: "한우 선물세트 1호",
    type: "return",
    status: "requested",
    reason: "상품 불량",
    requestedAt: "2026-06-13 09:05",
  },
  {
    id: "CLM-2606-008",
    orderId: "20260608-022",
    channel: "toss",
    partner: "원시인",
    customer: "김하은",
    product: "캠핑 접이의자",
    type: "exchange",
    status: "collecting",
    reason: "색상 변경",
    requestedAt: "2026-06-09 13:50",
  },
  {
    id: "CLM-2605-009",
    orderId: "20260528-011",
    channel: "eleven",
    partner: "위아즈",
    customer: "정유진",
    product: "블루투스 스피커",
    type: "exchange",
    status: "completed",
    reason: "사이즈 교환",
    requestedAt: "2026-05-29 15:40",
  },
]

// ===========================================================================
// 아래 코드를 data.ts 파일 맨 아래에 추가하세요.
// (ORDERS, CLAIMS, CHANNELS, CHANNEL_CONNECTIONS 가 이미 정의된 뒤에 와야 합니다)
//
// DB에 주문을 수집·저장하는 맥락을 보여주는 파생 통계.
// 데모지만 전부 ORDERS/CLAIMS/CHANNEL_CONNECTIONS 실제 목데이터에서 계산한다.
// (하드코딩 수치 금지 — 데이터가 바뀌면 대시보드도 따라 바뀌게)
// ===========================================================================

// "오늘"의 기준 날짜. 목데이터가 2026-07-27에 몰려 있으므로 이 값을 기준일로 쓴다.
// 실제 연동 시에는 new Date() 로 대체.
export const TODAY = "2026-07-27"

// ---- 진행중 상태(파이프라인에 살아있는 주문) 정의 ----
const ACTIVE_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing",
  "shipping",
  "delayed",
  "sync_failed",
]

// ---- 미처리(운영자 손이 필요한) 상태 정의 ----
const UNHANDLED_STATUSES: OrderStatus[] = ["new", "confirmed", "preparing"]

function isToday(dt: string) {
  return dt.startsWith(TODAY)
}

// ---------------------------------------------------------------------------
// 상단 KPI 4종 — 규모 + 처리현황을 섞는다
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  collectedToday: number // 오늘 수집된 주문 (DB에 새로 쌓인 양)
  totalStored: number // 저장된 전체 주문 (누적 규모)
  shippedToday: number // 오늘 발송 처리된 주문 (배송중+배송완료 중 오늘 건)
  unhandled: number // 미처리 — 운영자가 처리해야 할 주문
}

export function getDashboardKpis(): DashboardKpis {
  const collectedToday = ORDERS.filter((o) => isToday(o.orderedAt)).length
  const totalStored = ORDERS.length
  const shippedToday = ORDERS.filter(
    (o) =>
      (o.status === "shipping" || o.status === "delivered") &&
      isToday(o.orderedAt),
  ).length
  const unhandled = ORDERS.filter((o) =>
    UNHANDLED_STATUSES.includes(o.status),
  ).length
  return { collectedToday, totalStored, shippedToday, unhandled }
}

// ---------------------------------------------------------------------------
// 처리 파이프라인 — 진행중 주문이 어느 단계에 몰려 있는지 (막대 분포용)
// ---------------------------------------------------------------------------

export interface PipelineStage {
  status: OrderStatus
  label: string
  count: number
}

export function getPipeline(): PipelineStage[] {
  return ACTIVE_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_META[status].label,
    count: ORDERS.filter((o) => o.status === status).length,
  })).filter((s) => s.count > 0)
}

// ---------------------------------------------------------------------------
// 채널별 저장 건수 — 각 채널에서 DB로 수집된 주문 수 + 마지막 동기화 시각
// ---------------------------------------------------------------------------

export interface ChannelStat {
  value: ChannelValue
  label: string
  dotColor: string
  orderCount: number
  claimCount: number
  lastSyncedAt: string | null
  keyExpiresInDays: number | null
  status: ConnStatus
}

export function getChannelStats(): ChannelStat[] {
  return CHANNELS.map((ch) => {
    const conn = CHANNEL_CONNECTIONS[ch.value]
    return {
      value: ch.value,
      label: ch.label,
      dotColor: ch.dotColor,
      orderCount: ORDERS.filter((o) => o.channel === ch.value).length,
      claimCount: CLAIMS.filter((c) => c.channel === ch.value).length,
      lastSyncedAt: conn.lastSyncedAt,
      keyExpiresInDays: conn.keyExpiresInDays,
      status: conn.status,
    }
  }).sort((a, b) => b.orderCount - a.orderCount) // 많이 쌓인 채널 먼저
}

// ---------------------------------------------------------------------------
// 신선도 — 가장 마지막으로 수집된 시각 (전 채널 중 최신)
// "우리 DB가 이 시각 기준으로 최신이다"를 보여준다
// ---------------------------------------------------------------------------

export function getLastSyncedAt(): string | null {
  const times = Object.values(CHANNEL_CONNECTIONS)
    .map((c) => c.lastSyncedAt)
    .filter((t): t is string => t !== null)
    .sort()
  return times.length ? times[times.length - 1] : null
}

// "N분 전" 상대시각. 기준시각(now)을 인자로 받아 순수함수로 유지.
// 데모에서는 목데이터의 최신 시각 + 6분을 현재로 가정해 호출한다.
export function formatRelativeTime(iso: string | null, nowIso: string): string {
  if (!iso) return "동기화 이력 없음"
  const then = new Date(iso.replace(" ", "T") + ":00").getTime()
  const now = new Date(nowIso.replace(" ", "T") + ":00").getTime()
  const diffMin = Math.max(0, Math.round((now - then) / 60000))
  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

// 데모용 "현재 시각" — 가장 최근 동기화보다 6분 뒤로 가정.
// 실제 연동 시 new Date() 기반으로 대체.
export function getDemoNow(): string {
  const last = getLastSyncedAt()
  if (!last) return TODAY + " 00:00"
  const d = new Date(last.replace(" ", "T") + ":00")
  d.setMinutes(d.getMinutes() + 6)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
