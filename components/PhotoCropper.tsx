'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LISTING_PHOTO_ASPECT,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  centeredOffset,
  clampOffset,
  clampSourceRect,
  displayedSize,
  loadOrientedImage,
  offsetForZoom,
  sourceRect,
  type Point,
  type Size,
} from '@/lib/photo-crop'

interface Props {
  file: File
  busy?: boolean
  onCancel: () => void
  onConfirm: (file: File) => void
}

export default function PhotoCropper({ file, busy = false, onCancel, onConfirm }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: number; x: number; y: number; origin: Point } | null>(null)
  const positionedRef = useRef(false)
  const userMovedRef = useRef(false)
  const zoomRef = useRef(1)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [error, setError] = useState('')
  const [trackedFile, setTrackedFile] = useState(file)

  if (file !== trackedFile) {
    setTrackedFile(file)
    setZoom(1)
    setPreviewUrl(null)
    setImage(null)
    setError('')
    setOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    positionedRef.current = false
    userMovedRef.current = false
    zoomRef.current = 1
    let cancelled = false
    let url = ''
    loadOrientedImage(file)
      .then((loaded) => {
        if (cancelled) {
          URL.revokeObjectURL(loaded.url)
          return
        }
        url = loaded.url
        setPreviewUrl(loaded.url)
        setImage(loaded.img)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read that photo.')
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    rootRef.current?.scrollIntoView?.({ block: 'center' })
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      setFrame((prev) => (prev.w === rect.width && prev.h === rect.height ? prev : { w: rect.width, h: rect.height }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [image])

  useEffect(() => {
    if (!image || frame.w === 0) return
    const natural = { w: image.naturalWidth, h: image.naturalHeight }
    setOffset((current) => {
      const displayed = displayedSize(natural, frame, zoomRef.current)
      if (!positionedRef.current || !userMovedRef.current) {
        positionedRef.current = true
        return centeredOffset(displayed, frame)
      }
      return clampOffset(current, displayed, frame)
    })
  }, [image, frame])

  function naturalSize(): Size | null {
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return null
    return { w: image.naturalWidth, h: image.naturalHeight }
  }

  function changeZoom(next: number) {
    const natural = naturalSize()
    if (!natural || frame.w === 0) {
      setZoom(next)
      zoomRef.current = next
      return
    }
    const prev = displayedSize(natural, frame, zoomRef.current)
    const upcoming = displayedSize(natural, frame, next)
    userMovedRef.current = true
    setOffset((current) => offsetForZoom(current, prev, upcoming, frame))
    zoomRef.current = next
    setZoom(next)
  }

  function nudge(dx: number, dy: number) {
    const natural = naturalSize()
    if (!natural || frame.w === 0) return
    const displayed = displayedSize(natural, frame, zoom)
    userMovedRef.current = true
    setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }, displayed, frame))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: offset }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const natural = naturalSize()
    if (!drag || drag.id !== e.pointerId || !natural || frame.w === 0) return
    const displayed = displayedSize(natural, frame, zoom)
    userMovedRef.current = true
    setOffset(
      clampOffset(
        { x: drag.origin.x + (e.clientX - drag.x), y: drag.origin.y + (e.clientY - drag.y) },
        displayed,
        frame,
      ),
    )
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 24 : 8
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nudge(step, 0)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      nudge(-step, 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nudge(0, step)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nudge(0, -step)
    }
  }

  async function confirm() {
    const natural = naturalSize()
    if (!image || !natural || frame.w === 0) return
    const displayed = displayedSize(natural, frame, zoom)
    const src = clampSourceRect(sourceRect(offset, displayed, frame, natural), natural)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_WIDTH
    canvas.height = OUTPUT_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Could not crop that photo.')
      return
    }
    ctx.drawImage(image, src.x, src.y, src.w, src.h, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setError('Could not crop that photo.')
      return
    }
    onConfirm(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
  }

  const natural = naturalSize()
  const displayed = natural && frame.w > 0 ? displayedSize(natural, frame, zoom) : null

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-xl bg-slate-900 touch-none cursor-grab active:cursor-grabbing select-none"
        style={{ aspectRatio: String(LISTING_PHOTO_ASPECT) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Drag to choose which part of the photo shows. Arrow keys move it."
      >
        {displayed && previewUrl && (
          // The frame positions this bitmap by pixel. next/image would crop it again.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            draggable={false}
            className="absolute top-0 left-0 max-w-none"
            style={{
              width: displayed.w,
              height: displayed.h,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2 rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgba(15,23,42,0.55)]" />
        {!image && !error && (
          <p className="absolute inset-0 grid place-items-center text-xs text-white/80">Loading photo…</p>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Drag the photo to choose what shows on the listing. The circle is the round photo on the pro page.
      </p>
      <label className="flex items-center gap-3 text-xs font-semibold text-slate-700">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          aria-label="Zoom"
          disabled={busy || !image}
          onChange={(e) => changeZoom(Number(e.target.value))}
          className="flex-1 accent-slate-900"
        />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || !image}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Use this photo'}
        </button>
      </div>
    </div>
  )
}

export function ProPhotoPicker({
  onUploaded,
  onError,
  onUploading,
  onCroppingChange,
}: {
  onUploaded: (url: string) => void
  onError: (message: string) => void
  onUploading: (uploading: boolean) => void
  onCroppingChange?: (cropping: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  function chooseFile(next: File | null) {
    setFile(next)
    onCroppingChange?.(next !== null)
  }

  function setUploading(next: boolean) {
    setBusy(next)
    onUploading(next)
  }

  async function upload(cropped: File) {
    setUploading(true)
    onError('')
    const formData = new FormData()
    formData.append('file', cropped)
    try {
      const res = await fetch('/api/curated/photo', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError(data.error ?? 'Upload failed')
        return
      }
      onUploaded(data.url)
      chooseFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      onError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (file) {
    return (
      <PhotoCropper
        file={file}
        busy={busy}
        onCancel={() => {
          if (busy) return
          chooseFile(null)
          if (inputRef.current) inputRef.current.value = ''
        }}
        onConfirm={(cropped) => void upload(cropped)}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      onChange={(e) => {
        const next = e.target.files?.[0]
        if (next) chooseFile(next)
      }}
      className="text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 hover:file:bg-slate-200 file:text-sm file:font-medium"
    />
  )
}
