'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CATEGORIES } from '@/lib/categories'
import { CATEGORY_IMAGES } from '@/lib/category-images'
import CityMultiSelect from './CityMultiSelect'
import { ProPhotoPicker } from './PhotoCropper'
import type { Business } from '@/lib/business'

interface BaseProps {
  onClose: () => void
  onSaved: () => void
}

export function ManualBusinessModal({ onClose, onSaved }: BaseProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedDefaultImage, setSelectedDefaultImage] = useState<string | null>(null)
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [cities, setCities] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim() || cities.length === 0) {
      setError('Name and at least one city are required')
      return
    }
    setSaving(true)
    setError('')
    const categories = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const effectiveImageUrl = imageUrl || selectedDefaultImage || ''
    const res = await fetch('/api/curated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'manual',
        name,
        phone,
        address,
        websiteUrl,
        imageUrl: effectiveImageUrl,
        category,
        cities,
        categories,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <ModalShell title="Add a business manually" onClose={onClose}>
      <Field label="Business name *">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Category *">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setSelectedDefaultImage(null) }} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 bg-white">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Cities served *">
        <CityMultiSelect value={cities} onChange={setCities} />
        <p className="text-xs text-slate-500 mt-1">Add every city this pro serves. Each saved as lowercase first segment.</p>
      </Field>

      <Field label="Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Address">
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Website URL">
        <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Tags (comma-separated)">
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Plumbing, Emergency Service" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <PhotoControls
        imageUrl={imageUrl}
        selectedDefaultImage={selectedDefaultImage}
        category={category}
        onUploaded={(url) => {
          setImageUrl(url)
          setSelectedDefaultImage(null)
        }}
        onToggleDefault={(url) => setSelectedDefaultImage(url === selectedDefaultImage ? null : url)}
        onError={setError}
        onUploading={setUploading}
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <ModalActions>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save business'}
        </button>
      </ModalActions>
    </ModalShell>
  )
}

export function EditManualBusinessModal({
  business,
  onClose,
  onSaved,
}: BaseProps & { business: Business }) {
  const [name, setName] = useState(business.name)
  const [phone, setPhone] = useState(business.phone ?? '')
  const [address, setAddress] = useState(business.address ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(business.websiteUrl ?? '')
  const [reviewUrl, setReviewUrl] = useState(business.reviewUrl ?? '')
  const [imageUrl, setImageUrl] = useState(business.imageUrl ?? '')
  const [selectedDefaultImage, setSelectedDefaultImage] = useState<string | null>(null)
  const [category, setCategory] = useState(business.category ?? CATEGORIES[0].value)
  const [cities, setCities] = useState<string[]>(business.cities ?? [])
  const [tagsInput, setTagsInput] = useState((business.categories ?? []).join(', '))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim() || cities.length === 0) {
      setError('Name and at least one city are required')
      return
    }
    setSaving(true)
    setError('')
    const categories = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const effectiveImageUrl = imageUrl || selectedDefaultImage || ''
    const res = await fetch('/api/curated', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: business.id,
        source: 'manual',
        name,
        phone,
        address,
        websiteUrl,
        reviewUrl,
        imageUrl: effectiveImageUrl,
        category,
        cities_update: cities,
        categories,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <ModalShell title="Edit business" onClose={onClose}>
      <Field label="Business name *">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Category *">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setSelectedDefaultImage(null) }} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 bg-white">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Cities served *">
        <CityMultiSelect value={cities} onChange={setCities} />
      </Field>

      <Field label="Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Address">
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Website URL">
        <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <Field label="Review URL">
        <input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/.../review" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
        <p className="text-xs text-slate-500 mt-1">Link customers use to leave a review (e.g. a Google Maps review link). Powers the &quot;Get Reviews&quot; button.</p>
      </Field>

      <Field label="Tags (comma-separated)">
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Plumbing, Emergency Service" className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5" />
      </Field>

      <PhotoControls
        imageUrl={imageUrl}
        selectedDefaultImage={selectedDefaultImage}
        category={category}
        onUploaded={(url) => {
          setImageUrl(url)
          setSelectedDefaultImage(null)
        }}
        onToggleDefault={(url) => setSelectedDefaultImage(url === selectedDefaultImage ? null : url)}
        onError={setError}
        onUploading={setUploading}
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <ModalActions>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </ModalActions>
    </ModalShell>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}

function PhotoControls({
  imageUrl,
  selectedDefaultImage,
  category,
  onUploaded,
  onToggleDefault,
  onError,
  onUploading,
}: {
  imageUrl: string
  selectedDefaultImage: string | null
  category: string
  onUploaded: (url: string) => void
  onToggleDefault: (url: string) => void
  onError: (message: string) => void
  onUploading: (uploading: boolean) => void
}) {
  const [cropping, setCropping] = useState(false)
  const preview = imageUrl || selectedDefaultImage
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-700">Photo</span>
      <div className="flex flex-col gap-2">
        {preview && (
          <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            <Image src={preview} alt="preview" fill className="object-cover" sizes="64px" />
          </div>
        )}
        <ProPhotoPicker
          onUploaded={onUploaded}
          onError={onError}
          onUploading={onUploading}
          onCroppingChange={setCropping}
        />
        {!imageUrl && !cropping && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Or pick a default:</p>
            <div className="flex gap-2 flex-wrap">
              {(CATEGORY_IMAGES[category] ?? []).map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onToggleDefault(url)}
                  className={`relative h-14 w-14 rounded-lg overflow-hidden ring-2 transition-all ${
                    selectedDefaultImage === url ? 'ring-amber-400' : 'ring-transparent hover:ring-slate-300'
                  }`}
                >
                  <Image src={url} alt="default option" fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>
}
