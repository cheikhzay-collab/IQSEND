import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Handles media uploads (images and videos) for WhatsApp campaigns.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Format de fichier non supporté. Veuillez choisir une image ou une vidéo.' },
        { status: 400 }
      );
    }

    // Limit size: 25MB for video, 8MB for image
    const maxSize = isVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Limite : ${isVideo ? '25 Mo' : '8 Mo'}.`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'campaigns');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Clean filename
    const ext = path.extname(file.name) || (isImage ? '.jpg' : '.mp4');
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const safeFilename = `camp_${timestamp}_${randomHex}${ext}`;
    const filePath = path.join(uploadDir, safeFilename);

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/campaigns/${safeFilename}`;

    // 1. Dual-write to persistent OS directory across Hostinger version deployments
    try {
      const os = await import('os');
      const persistentDir = path.join(os.homedir(), '.sendit_persistent_uploads', 'campaigns');
      if (!existsSync(persistentDir)) {
        await mkdir(persistentDir, { recursive: true });
      }
      await writeFile(path.join(persistentDir, safeFilename), buffer);
    } catch {}

    // 2. Backup to MySQL media_uploads table
    try {
      const { getMysqlPool } = await import('@/lib/db');
      const pool = getMysqlPool();
      const fileData = isImage && buffer.length <= 6 * 1024 * 1024 ? buffer.toString('base64') : null;
      await pool.execute(
        `INSERT INTO media_uploads (id, filename, file_path, mime_type, media_type, file_data, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE file_data = VALUES(file_data), size_bytes = VALUES(size_bytes)`,
        [
          `med_${timestamp}_${randomHex}`,
          safeFilename,
          publicUrl,
          mimeType,
          isVideo ? 'VIDEO' : 'IMAGE',
          fileData,
          file.size,
        ]
      );
    } catch {}

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      size: file.size,
      mimeType,
    });
  } catch (error: any) {
    console.error('[Upload API Exception]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du téléversement du média' },
      { status: 500 }
    );
  }
}

