import { describe, expect, it } from 'vitest'
import {
  clampOffset,
  clampSourceRect,
  centeredOffset,
  displayedSize,
  offsetForZoom,
  sourceRect,
} from './photo-crop'

const image = { w: 1000, h: 500 }
const frame = { w: 250, h: 100 }

describe('photo crop geometry', () => {
  it('covers the frame at zoom 1', () => {
    const displayed = displayedSize(image, frame, 1)
    expect(displayed.w).toBeGreaterThanOrEqual(frame.w)
    expect(displayed.h).toBeGreaterThanOrEqual(frame.h)
    expect(displayed).toEqual({ w: 250, h: 125 })
  })

  it('centers a taller image and maps the visible slice back to source pixels', () => {
    const displayed = displayedSize(image, frame, 1)
    const offset = centeredOffset(displayed, frame)
    expect(offset).toEqual({ x: 0, y: -12.5 })

    const src = sourceRect(offset, displayed, frame, image)
    expect(src.x).toBeCloseTo(0)
    expect(src.y).toBeCloseTo(50)
    expect(src.w).toBeCloseTo(1000)
    expect(src.h).toBeCloseTo(400)
  })

  it('does not leave empty edges when dragged past the image', () => {
    const displayed = displayedSize(image, frame, 1)
    expect(clampOffset({ x: 40, y: 30 }, displayed, frame)).toEqual({ x: 0, y: 0 })
    expect(clampOffset({ x: -400, y: -400 }, displayed, frame)).toEqual({ x: 0, y: -25 })
  })

  it('keeps the framed center in place when zooming in', () => {
    const before = displayedSize(image, frame, 1)
    const start = centeredOffset(before, frame)
    const after = displayedSize(image, frame, 2)
    const next = offsetForZoom(start, before, after, frame)
    const center = sourceRect(next, after, frame, image)
    const prev = sourceRect(start, before, frame, image)
    const prevMidX = prev.x + prev.w / 2
    const prevMidY = prev.y + prev.h / 2
    expect(center.x + center.w / 2).toBeCloseTo(prevMidX)
    expect(center.y + center.h / 2).toBeCloseTo(prevMidY)
    expect(center.w).toBeCloseTo(prev.w / 2)
  })

  it('clamps a source rect that rounding pushed outside the image', () => {
    expect(clampSourceRect({ x: -2, y: 10, w: 2000, h: 50 }, image)).toEqual({
      x: 0,
      y: 10,
      w: 1000,
      h: 50,
    })
  })
})
