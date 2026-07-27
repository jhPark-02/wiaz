import { Suspense } from "react"
import ShippingFlow from "./_components/shipping-flow"

export default function ShippingPage() {
  return (
    <Suspense fallback={null}>
      <ShippingFlow />
    </Suspense>
  )
}
