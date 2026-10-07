import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL
  )
}

function client(): S3Client | null {
  if (!isStorageConfigured()) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function uploadPublicObject(
  body: Uint8Array,
  contentType: string,
  key: string
): Promise<string> {
  const s3 = client()
  if (!s3) throw new Error('Storage not configured')
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
  return `${base}/${key}`
}
