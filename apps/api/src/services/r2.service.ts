import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

export class R2Service {
  private static getS3Client() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Compress and optimize logo image
   */
  static async compressLogo(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const compressed = await sharp(buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 8 })
        .toBuffer();

      return { buffer: compressed, mimeType: 'image/png' };
    } catch (error) {
      console.warn('Image compression fallback:', error);
      return { buffer, mimeType: 'image/png' };
    }
  }

  /**
   * Upload file to Cloudflare R2 bucket with fallback to base64 Data URL
   */
  static async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    folder: 'logos' | 'receipts' | 'documents' = 'logos'
  ): Promise<string> {
    const { buffer: compressedBuffer, mimeType } = await this.compressLogo(fileBuffer);
    const client = this.getS3Client();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${Date.now()}_${sanitizedName}.png`;

    if (client && bucketName) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: compressedBuffer,
            ContentType: mimeType,
          })
        );

        const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return baseUrl ? `${baseUrl}/${key}` : `https://${bucketName}.r2.dev/${key}`;
      } catch (error) {
        console.error('Failed to upload to Cloudflare R2, falling back to Data URL:', error);
      }
    }

    // Fallback: Data URL if R2 credentials are not set yet
    return `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;
  }
}
