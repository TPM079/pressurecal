import { CardShell } from "../shared/CardShell"

interface Props {
  recommendations: string[]
}

export function RecommendationsCard({ recommendations }: Props) {
  if (!recommendations.length) {
    return (
      <CardShell title="Suggested Fixes">
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No major fixes suggested at the moment.
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell title="Suggested Fixes">
      <div className="space-y-2">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation}
            className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {recommendation}
          </div>
        ))}
      </div>
    </CardShell>
  )
}