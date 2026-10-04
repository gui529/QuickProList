'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const fieldClass =
  'block w-full border-b border-[rgba(60,60,67,0.29)] px-4 py-2 last:border-b-0'

const inputClass =
  'mt-1 h-11 w-full bg-transparent text-[17px] leading-[22px] text-black focus:outline-none'

export default function ListBusinessSection({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [zip, setZip] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const res = await fetch('/api/list-business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName, contactName, email, phone, category, zip, message,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Could not submit. Try again.')
      setStatus('error')
      return
    }

    setStatus('success')
    setBusinessName(''); setContactName(''); setEmail(''); setPhone(''); setZip(''); setMessage('')
  }

  if (status === 'success') {
    return <p className="text-[17px] leading-[22px] text-black">Application received.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-[10px] bg-white">
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">Business name</span>
        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputClass} />
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">Your name</span>
        <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className={inputClass} />
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">Phone</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required className={inputClass}>
          {CATEGORIES.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">ZIP</span>
        <input type="text" inputMode="numeric" value={zip} onChange={(e) => setZip(e.target.value)} required className={inputClass} />
      </label>
      <label className={fieldClass}>
        <span className="text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">About your business</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none bg-transparent text-[17px] leading-[22px] text-black focus:outline-none"
        />
      </label>

      {errorMsg && (
        <p className="px-4 py-2 text-[15px] leading-5 text-[#FF3B30]">{errorMsg}</p>
      )}

      <div className="flex items-center gap-2 p-4">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="h-11 flex-1 rounded-[10px] bg-[#007AFF] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-3 text-[17px] text-[#007AFF]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
