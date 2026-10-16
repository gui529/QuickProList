// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import PhotoCropper, { ProPhotoPicker } from './PhotoCropper'

vi.mock('@/lib/photo-crop', async () => {
  const actual = await vi.importActual<typeof import('@/lib/photo-crop')>('@/lib/photo-crop')
  return {
    ...actual,
    loadOrientedImage: vi.fn(async () => {
      const img = new Image()
      Object.defineProperty(img, 'naturalWidth', { value: 1000 })
      Object.defineProperty(img, 'naturalHeight', { value: 500 })
      return { img, url: 'blob:test-photo' }
    }),
  }
})

function mockFrameSize() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 250,
    height: 100,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 100,
    right: 250,
    toJSON() {
      return {}
    },
  })
}

describe('PhotoCropper', () => {
  const drawImage = vi.fn()

  beforeEach(() => {
    mockFrameSize()
    drawImage.mockClear()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage })) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }))
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('lets you drag the photo and uploads the piece inside the frame', async () => {
    const onConfirm = vi.fn()
    render(<PhotoCropper file={new File(['img'], 'truck.png', { type: 'image/png' })} onCancel={() => {}} onConfirm={onConfirm} />)

    const photo = await waitFor(() => {
      const img = document.querySelector('img')
      expect(img).toBeTruthy()
      expect(img!.style.transform).toBe('translate(0px, -12.5px)')
      return img!
    })

    const frame = screen.getByRole('application', { name: /drag to choose/i })
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 10, clientY: 80 })
    expect(photo.style.transform).toBe('translate(0px, 0px)')

    fireEvent.click(screen.getByRole('button', { name: 'Use this photo' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
    const file = onConfirm.mock.calls[0][0] as File
    expect(file.name).toBe('photo.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(drawImage).toHaveBeenCalledWith(expect.any(Image), 0, 0, 1000, 400, 0, 0, 1500, 600)
  })
})

describe('ProPhotoPicker', () => {
  beforeEach(() => {
    mockFrameSize()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens the cropper instead of uploading the original file', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(
      <ProPhotoPicker onUploaded={() => {}} onError={() => {}} onUploading={() => {}} />,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'shop.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/drag the photo to choose what shows/i)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
