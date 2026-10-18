import { NextResponse } from 'next/server';
import { getProductsFromDb } from '@/lib/db-service';
import { getProducts, ProductItem } from '@/lib/products-store';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbProducts = await getProductsFromDb();
    if (dbProducts && dbProducts.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'database',
        products: dbProducts,
        count: dbProducts.length,
      });
    }

    const fallbackProducts = getProducts();
    return NextResponse.json({
      success: true,
      source: 'memory_fallback',
      products: fallbackProducts,
      count: fallbackProducts.length,
    });
  } catch (error) {
    console.error('[API Products GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        products: getProducts(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, nameAr, sku, basePrice, costPrice, stockQuantity, category, descriptionAr, imageUrl } = body;

    if (!name || !sku || basePrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'name, sku, and basePrice are required' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const id = body.id || `prod-${Date.now()}`;

    await pool.execute(
      `
      INSERT INTO products (
        id, name, name_ar, sku, base_price, cost_price, stock_quantity, category, description_ar, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_ar = VALUES(name_ar),
        base_price = VALUES(base_price),
        cost_price = VALUES(cost_price),
        stock_quantity = VALUES(stock_quantity),
        category = VALUES(category),
        description_ar = VALUES(description_ar),
        image_url = VALUES(image_url),
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        id,
        name,
        nameAr || name,
        sku,
        parseFloat(basePrice),
        parseFloat(costPrice || 0),
        parseInt(stockQuantity || 0, 10),
        category || 'General',
        descriptionAr || '',
        imageUrl || '',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Product saved to database successfully',
      productId: id,
    });
  } catch (error) {
    console.error('[API Products POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
