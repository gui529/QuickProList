import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          borderRadius: 40,
          position: 'relative',
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 11.5 12 4l9 7.5"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 10v10h14V10"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 20v-5h4v5"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: '#fbbf24',
            border: '8px solid #fff',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
