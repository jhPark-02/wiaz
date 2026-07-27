import { Suspense } from "react"
import ClaimsView from "./claims-view"

export default function ClaimsPage() {
  return (
    <Suspense fallback={null}>
      <ClaimsView />
    </Suspense>
  )
}
