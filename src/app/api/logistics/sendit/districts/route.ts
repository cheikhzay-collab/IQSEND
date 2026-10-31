import { NextResponse } from 'next/server';
import { senditService } from '@/lib/sendit-service';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Try to load from cached districts file
    const filePath = path.join(process.cwd(), 'data', 'sendit-districts.json');
    let districts: any[] = [];

    if (fs.existsSync(filePath)) {
      try {
        districts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {}
    }

    // 2. If empty, fetch from senditService
    if (!districts || districts.length === 0) {
      districts = await senditService.getDistricts();
    }

    // Most common Moroccan cities for quick access
    const POPULAR_CITIES = [
      'Casablanca',
      'Rabat',
      'Marrakech',
      'Fès',
      'Tanger',
      'Agadir',
      'Salé',
      'Meknès',
      'Oujda',
      'Kénitra',
      'Tétouan',
      'El Jadida',
      'Mohammedia',
      'Nador',
      'Béni Mellal',
      'Safi',
      'Khouribga',
      'Berrechid',
      'Settat',
      'Témara',
      'Larache',
      'Jerada',
    ];

    const sortedDistricts = districts
      .map((d) => ({
        id: d.id,
        ville: d.ville || d.name,
        name: d.name || d.ville,
        arabic_name: d.arabic_name,
        price: Number(d.price) || 35,
        delais: d.delais || '24h - 48h',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

    return NextResponse.json({
      success: true,
      total: sortedDistricts.length,
      popularCities: POPULAR_CITIES,
      districts: sortedDistricts,
    });
  } catch (error: any) {
    console.error('[API Sendit Districts GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      districts: [],
    }, { status: 500 });
  }
}
