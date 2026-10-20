import { NextRequest, NextResponse } from 'next/server';
import { getMysqlPool } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT id, agent_name, role_title, system_prompt, tone, language, auto_confirm_threshold, gemini_model, is_active
      FROM ai_agent_configs
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const config = rows[0];
      return NextResponse.json({
        success: true,
        source: 'database',
        config: {
          id: config.id,
          agentName: config.agent_name,
          roleTitle: config.role_title,
          systemPrompt: config.system_prompt,
          tone: config.tone,
          language: config.language,
          autoConfirmThreshold: config.auto_confirm_threshold,
          geminiModel: config.gemini_model,
          isActive: Boolean(config.is_active),
        },
      });
    }

    // Default configuration if not yet initialized
    const defaultPrompt = `Tu es Sarah, l'agent IA d'élite de confirmation et vente additionnelle (Up-sell) pour SENDIT COD Maroc.
Ton rôle est de contacter les clients marocains sur WhatsApp dès qu'ils passent commande pour confirmer leur nom, adresse exacte et disponibilité.
Tu t'exprimes en Darija marocaine courtoise, chaleureuse et professionnelle.
Tu réponds aux objections sur les prix, la livraison et l'essayage avant paiement en espèces (Cash on Delivery).`;

    return NextResponse.json({
      success: true,
      source: 'default',
      config: {
        id: 'sarah-agent-01',
        agentName: 'Sarah (AI COD Specialist)',
        roleTitle: 'Spécialiste Confirmation & Vente Additionnelle',
        systemPrompt: defaultPrompt,
        tone: 'Darija Professional & Courteous',
        language: 'ar-MA',
        autoConfirmThreshold: 70,
        geminiModel: 'gemini-1.5-flash',
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error('[API AI-Agents GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentName,
      roleTitle,
      systemPrompt,
      tone,
      language,
      autoConfirmThreshold,
      geminiModel,
      isActive,
    } = body;

    const pool = getMysqlPool();
    const id = body.id || 'sarah-agent-01';

    await pool.execute(
      `INSERT INTO ai_agent_configs (
        id, agent_name, role_title, system_prompt, tone, language, auto_confirm_threshold, gemini_model, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        agent_name = VALUES(agent_name),
        role_title = VALUES(role_title),
        system_prompt = VALUES(system_prompt),
        tone = VALUES(tone),
        language = VALUES(language),
        auto_confirm_threshold = VALUES(auto_confirm_threshold),
        gemini_model = VALUES(gemini_model),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        agentName || 'Sarah (AI COD Specialist)',
        roleTitle || 'Spécialiste Confirmation & Vente Additionnelle',
        systemPrompt || '',
        tone || 'Darija Professional & Courteous',
        language || 'ar-MA',
        parseInt(autoConfirmThreshold ?? 70, 10),
        geminiModel || 'gemini-1.5-flash',
        isActive !== undefined ? Boolean(isActive) : true,
      ]
    );

    // Also persist into store_settings for global availability
    await pool.execute(
      `INSERT INTO store_settings (setting_key, setting_value, updated_at)
       VALUES ('AI_SYSTEM_PROMPT', ?, CURRENT_TIMESTAMP), ('AI_CONFIRM_THRESHOLD', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [systemPrompt || '', String(autoConfirmThreshold ?? 70)]
    );

    realtimeHub.broadcast({
      eventType: 'AI_CONFIG_UPDATED',
      entityType: 'AI_AGENT',
      entityId: id,
      title: 'Configuration de l agent Sarah mise à jour dans MySQL',
      payload: { agentName, geminiModel, autoConfirmThreshold },
      source: 'AI_AGENTS_API',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Directives et persona de l agent IA enregistrés avec succès dans MySQL !',
      id,
    });
  } catch (error: any) {
    console.error('[API AI-Agents POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
