/**
 * Sara Live Agent API Route
 * POST /api/sara-live/chat
 *
 * يقبل: نص + صورة (base64) + صوت (base64)
 * يرجع: رد سارة + أدوات استُدعيت + صور المنتج
 */
import { NextRequest, NextResponse } from 'next/server';
import { processSaraMessage, getAllSaraSessions, deleteSaraSession } from '@/lib/sara-live-agent';

export const dynamic = 'force-dynamic';

// ── POST: Send a message to Sara ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      sessionId,
      userText,
      userImageBase64,
      userImageMimeType,
      userAudioBase64,
      userAudioMimeType,
      customerPhone,
      customerName,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId مطلوب' }, { status: 400 });
    }

    if (!userText && !userImageBase64 && !userAudioBase64) {
      return NextResponse.json(
        { success: false, error: 'يجب إرسال نص أو صورة أو صوت على الأقل' },
        { status: 400 }
      );
    }

    const result = await processSaraMessage({
      sessionId,
      userText,
      userImageBase64,
      userImageMimeType: userImageMimeType || 'image/jpeg',
      userAudioBase64,
      userAudioMimeType: userAudioMimeType || 'audio/webm',
      customerPhone,
      customerName,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      reply: result.text,
      toolCalled: result.toolCalled,
      toolResult: result.toolResult,
      suggestedActions: result.suggestedActions,
      productImages: result.productImages,
    });
  } catch (err: any) {
    console.error('[Sara Live API] POST Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'خطأ في معالجة الرسالة' },
      { status: 500 }
    );
  }
}

// ── GET: List all active sessions ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'sessions') {
      const sessions = getAllSaraSessions().map(s => ({
        sessionId: s.sessionId,
        customerPhone: s.customerPhone,
        customerName: s.customerName,
        messageCount: s.messages.length,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        currentOrderId: s.currentOrderId,
      }));
      return NextResponse.json({ success: true, sessions, total: sessions.length });
    }

    return NextResponse.json({
      success: true,
      agent: 'Sara Live Agent v2.0',
      description: 'وكيلة ذكاء اصطناعي متكاملة — صوت + صورة + دارجة مغربية',
      capabilities: [
        'تحليل الصور (Vision)',
        'فهم الصوت (Audio)',
        'البيع بالدارجة المغربية',
        'عرض كتالوج المنتجات',
        'تتبع الطلبات',
        'تسجيل طلبات جديدة',
        'ذاكرة المحادثة',
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE: Clear a session ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId مطلوب' }, { status: 400 });
    }
    deleteSaraSession(sessionId);
    return NextResponse.json({ success: true, message: `تم حذف الجلسة ${sessionId}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
