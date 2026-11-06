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

