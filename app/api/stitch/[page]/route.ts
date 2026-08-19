import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ page: string }> }
) {
  const { page } = await context.params;
  const filePath = path.join(process.cwd(), 'public', 'stitch', `${page}.html`);
  
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
