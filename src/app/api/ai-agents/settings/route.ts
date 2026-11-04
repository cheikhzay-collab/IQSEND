import { NextRequest, NextResponse } from 'next/server';
import { getAgentSettings, saveAgentSettings } from '@/lib/agent-rules-engine';

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
