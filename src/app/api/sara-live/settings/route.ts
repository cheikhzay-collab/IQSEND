import { NextRequest, NextResponse } from 'next/server';
import { getSaraWhatsAppConfig, updateSaraWhatsAppConfig } from '@/lib/sara-whatsapp-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSaraWhatsAppConfig();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch Sara WhatsApp config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateSaraWhatsAppConfig(body);
    return NextResponse.json({
      success: true,
      message: 'تم تحديث إعدادات سارة لايف والواتساب بنجاح',
      config: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update Sara WhatsApp config' },
      { status: 500 }
    );
  }
}
