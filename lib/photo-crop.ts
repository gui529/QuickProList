export type Size = { w: number; h: number }
export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

/** Search-card photo on a phone: full width by 9rem. */
export const LISTING_PHOTO_ASPECT = 5 / 2

export const OUTPUT_WIDTH = 1500
export const OUTPUT_HEIGHT = OUTPUT_WIDTH / LISTING_PHOTO_ASPECT

export function displayedSize(image: Size, frame: Size, zoom: number): Size {
  const cover = Math.max(frame.w / image.w, frame.h / image.h)
  const scale = cover * zoom
  return { w: image.w * scale, h: image.h * scale }
}

export function clampOffset(offset: Point, displayed: Size, frame: Size): Point {
  return {
    x: Math.min(0, Math.max(frame.w - displayed.w, offset.x)),
    y: Math.min(0, Math.max(frame.h - displayed.h, offset.y)),
  }
}

export function centeredOffset(displayed: Size, frame: Size): Point {
  return clampOffset(
    { x: (frame.w - displayed.w) / 2, y: (frame.h - displayed.h) / 2 },
    displayed,
    frame,
  )
}

/** Keep the same image point under the middle of the frame when zoom changes. */
export function offsetForZoom(
  offset: Point,
  prevDisplayed: Size,
  nextDisplayed: Size,
  frame: Size,
): Point {
  const fx = (frame.w / 2 - offset.x) / prevDisplayed.w
  const fy = (frame.h / 2 - offset.y) / prevDisplayed.h
  return clampOffset(
    {
      x: frame.w / 2 - fx * nextDisplayed.w,
      y: frame.h / 2 - fy * nextDisplayed.h,
    },
    nextDisplayed,
    frame,
  )
}

export function sourceRect(offset: Point, displayed: Size, frame: Size, image: Size): Rect {
  return {
    x: (-offset.x / displayed.w) * image.w,
    y: (-offset.y / displayed.h) * image.h,
    w: (frame.w / displayed.w) * image.w,
    h: (frame.h / displayed.h) * image.h,
  }
}

export function clampSourceRect(rect: Rect, image: Size): Rect {
  const x = Math.min(Math.max(0, rect.x), Math.max(0, image.w - 1))
  const y = Math.min(Math.max(0, rect.y), Math.max(0, image.h - 1))
  const w = Math.max(1, Math.min(rect.w, image.w - x))
  const h = Math.max(1, Math.min(rect.h, image.h - y))
  return { x, y, w, h }
}

export function loadOrientedImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo. Use a JPEG or PNG.'))
    }
    img.src = url
  })
}
