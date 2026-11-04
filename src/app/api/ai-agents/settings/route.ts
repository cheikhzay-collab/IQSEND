import { NextRequest, NextResponse } from 'next/server';
import { getAgentSettings, saveAgentSettings, notifyStoreOwner } from '@/lib/agent-rules-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getAgentSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support sending a live test notification to the store owner's WhatsApp
    if (body.testOwnerAlert) {
      if (body.ownerNotifyPhone) {
        await saveAgentSettings({ ownerNotifyPhone: body.ownerNotifyPhone });
      }
      const notifyResult = await notifyStoreOwner({
        eventType: 'TEST_ALERT',
        order: {
          id: 'test_order_owner',
          orderNumber: 'TEST-ALERT',
          customerName: 'تجربة الإشعار',
          customerPhone: body.ownerNotifyPhone || '',
        },
      });
      return NextResponse.json({
        success: notifyResult.success,
        error: notifyResult.error,
        skipped: notifyResult.skipped,
        message: notifyResult.success
          ? 'تم إرسال الرسالة التجريبية إلى هاتف صاحب المتجر بنجاح!'
          : 'تعذر إرسال الإشعار، يرجى التأكد من تشغيل الواتساب وصحة الرقم.',
      });
    }

    const success = await saveAgentSettings(body);
    const updated = await getAgentSettings();

    return NextResponse.json({
      success,
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

