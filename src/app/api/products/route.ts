import { NextResponse } from 'next/server';
import { getProductsFromDb } from '@/lib/db-service';
import { getProducts, saveOrUpdateProductInStore, ProductItem } from '@/lib/products-store';
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
    const {
      id: rawId,
      name,
      nameAr,
      sku,
      basePrice,
      sellingPrice,
      costPrice,
      stockQuantity,
      totalStock,
      category,
      descriptionAr,
      image,
      imageUrl,
      additionalImages,
      variants,
      offers,
      agentInstructions,
      sellingPoints,
      objectionFaqs,
    } = body;

    const finalPrice = sellingPrice !== undefined ? sellingPrice : basePrice;
    if (!name || !sku || finalPrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Le nom, le SKU et le prix de vente sont requis.' },
        { status: 400 }
      );
    }

    const pool = getMysqlPool();
    const id = rawId || `prod-${Date.now()}`;

    // Combine images if additional images exist
    const primaryImg = image || imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
    let storedImageUrl = primaryImg;
    if (Array.isArray(additionalImages) && additionalImages.length > 0) {
      storedImageUrl = JSON.stringify([primaryImg, ...additionalImages.filter((img: string) => img && img.trim().length > 0)]);
    }

    const finalStock = totalStock !== undefined ? totalStock : stockQuantity || 0;

    await pool.execute(
      `
      INSERT INTO products (
        id, name, name_ar, sku, base_price, cost_price, stock_quantity, category, 
        image_url, attributes, description_ar, knowledge_base, selling_points, objection_faqs, upsell_bundles, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_ar = VALUES(name_ar),
        sku = VALUES(sku),
        base_price = VALUES(base_price),
        cost_price = VALUES(cost_price),
        stock_quantity = VALUES(stock_quantity),
        category = VALUES(category),
        image_url = VALUES(image_url),
        attributes = VALUES(attributes),
        description_ar = VALUES(description_ar),
        knowledge_base = VALUES(knowledge_base),
        selling_points = VALUES(selling_points),
        objection_faqs = VALUES(objection_faqs),
        upsell_bundles = VALUES(upsell_bundles),
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        id,
        name,
        nameAr || name,
        sku,
        parseFloat(finalPrice),
        parseFloat(costPrice || 0),
        parseInt(finalStock, 10),
        category || 'General',
        storedImageUrl,
        variants ? JSON.stringify(variants) : null,
        descriptionAr || '',
        agentInstructions || null,
        sellingPoints ? JSON.stringify(sellingPoints) : null,
        objectionFaqs ? JSON.stringify(objectionFaqs) : null,
        offers ? JSON.stringify(offers) : null,
      ]
    );

    // Also update in-memory catalog
    saveOrUpdateProductInStore({
      id,
      name,
      nameAr: nameAr || name,
      sku,
      category: category || 'General',
      image: primaryImg,
      additionalImages: Array.isArray(additionalImages) ? additionalImages : undefined,
      sellingPrice: parseFloat(finalPrice),
      costPrice: parseFloat(costPrice || 0),
      deliveryFee: 35,
      totalStock: parseInt(finalStock, 10),
      status: parseInt(finalStock, 10) > 15 ? 'IN_STOCK' : parseInt(finalStock, 10) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
      descriptionAr: descriptionAr || '',
      keywords: [name.toLowerCase(), (nameAr || '').toLowerCase(), sku.toLowerCase()],
      variants: Array.isArray(variants) ? variants : undefined,
      offers: Array.isArray(offers) ? offers : undefined,
      agentInstructions: agentInstructions || undefined,
      sellingPoints: Array.isArray(sellingPoints) ? sellingPoints : undefined,
      objectionFaqs: Array.isArray(objectionFaqs) ? objectionFaqs : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Produit et directives IA enregistrés avec succès dans MySQL !',
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

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID requis' }, { status: 400 });
    }

    const pool = getMysqlPool();
    await pool.execute('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Produit désactivé avec succès',
    });
  } catch (error) {
    console.error('[API Products DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
