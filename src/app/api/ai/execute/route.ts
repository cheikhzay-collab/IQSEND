import { NextRequest, NextResponse } from 'next/server';
import {
  executeAiLeadConfirmation,
  executeAiAutoPilotAll,
} from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, leadId } = body;

    // 1. Single lead confirmation
    if (action === 'confirm_lead') {
      if (!leadId) {
        return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
      }
      const result = await executeAiLeadConfirmation(leadId);
      return NextResponse.json(result);
    }

    // 2. Auto-Pilot: Process all NEW leads
    if (action === 'auto_pilot') {
      const result = await executeAiAutoPilotAll();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Action non reconnue. Actions valides: confirm_lead, auto_pilot',
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[API AI Execute] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur lors de l exécution de l Agent IA' },
      { status: 500 }
    );
  }
}
