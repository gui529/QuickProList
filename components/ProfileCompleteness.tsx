import {
  computeCompleteness,
  type ProfileCompletenessInput,
} from '@/lib/profile-completeness'

function StatusMark({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 10.5 15 16 9.5" />
      </svg>
    )
  }
  return <span className="h-4 w-4 rounded-full ring-2 ring-slate-300 flex-shrink-0" aria-hidden="true" />
}

export default function ProfileCompleteness({ business }: { business: ProfileCompletenessInput }) {
  const { score, items } = computeCompleteness(business)
  const doneCount = items.filter((item) => item.done).length

  return (
    <section aria-labelledby="profile-completeness-heading" className="mb-10 bg-white rounded-2xl ring-1 ring-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="profile-completeness-heading" className="text-lg font-bold text-slate-900">
            Profile completeness
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {score === 100
              ? 'Your profile is set up. Customers can find the details they need.'
              : 'Finish the open steps so customers can reach you and leave a review.'}
          </p>
        </div>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{score}%</p>
      </div>

      <div
        className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className={`h-full ${score === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {doneCount} of {items.length} complete
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => {
          const mark = (
            <>
              <StatusMark done={item.done} />
              <span>
                {item.label}
                {item.done ? <span className="sr-only">, complete</span> : null}
              </span>
            </>
          )

          if (!item.done && item.targetId) {
            return (
              <li key={item.id}>
                <a
                  href={`#${item.targetId}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 -mx-2 text-sm font-medium text-slate-900 hover:bg-amber-50 hover:text-amber-800"
                >
                  {mark}
                </a>
              </li>
            )
          }

          return (
            <li
              key={item.id}
              className="flex items-center gap-2.5 px-2 py-1.5 text-sm font-medium text-slate-700"
              title={!item.done && !item.targetId ? 'QuickProList turns this on for your listing' : undefined}
            >
              {mark}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
