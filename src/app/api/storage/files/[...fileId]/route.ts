import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string[] }> }
) {
  try {
    const { fileId } = await params;
    let filePathParam = fileId.join('/');

    // Enhanced logging to track image requests
    console.log('=== Image Request Debug ===');
    console.log('Requested fileId:', fileId);
    console.log('Joined filePath:', filePathParam);

    if (filePathParam.endsWith('/view')) {
      filePathParam = filePathParam.slice(0, -5);
    }

    let filePath = '';
    let foundFile = false;

    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'images');

    if (filePathParam.includes('/') || filePathParam.includes('\\')) {
      const directPath = path.join(uploadsDir, filePathParam);
      try {
        await fs.access(directPath);
        filePath = directPath;
        foundFile = true;
      } catch {}
    } else {
      for (const ext of possibleExtensions) {
        const testPath = path.join(uploadsDir, filePathParam + ext);
        try {
          await fs.access(testPath);
          filePath = testPath;
          foundFile = true;
          break;
        } catch {}
      }

      if (!foundFile) {
        const directPath = path.join(uploadsDir, filePathParam);
        try {
          await fs.access(directPath);
          filePath = directPath;
          foundFile = true;
        } catch {}
      }

      if (!foundFile) {
        for (const ext of possibleExtensions) {
          const testPath = path.join(uploadsDir, 'products', filePathParam + ext);
          try {
            await fs.access(testPath);
            filePath = testPath;
            foundFile = true;
            break;
          } catch {}
        }
      }
    }

    if (!foundFile) {
      return new NextResponse(
        `<!-- Fallback for missing image: ${filePathParam} -->`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
            'X-Fallback-Image': 'true'
          },
        }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (ext) {
      case '.jpg':
      case '.jpeg': contentType = 'image/jpeg'; break;
      case '.png': contentType = 'image/png'; break;
      case '.webp': contentType = 'image/webp'; break;
      case '.gif': contentType = 'image/gif'; break;
    }

    return new NextResponse(Buffer.from(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
