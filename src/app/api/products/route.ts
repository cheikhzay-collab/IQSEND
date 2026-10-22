import { NextResponse } from 'next/server';
import { getProductsFromDb } from '@/lib/db-service';
import {
  getProducts,
  saveOrUpdateProductInStore,
  deleteProductFromStore,
  syncStoreWithDbProducts,
  ProductItem,
} from '@/lib/products-store';
import { getMysqlPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbProducts = await getProductsFromDb();
    if (dbProducts) {
      // Keep in-memory store in sync with actual Hostinger MySQL database state
      syncStoreWithDbProducts(dbProducts);
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
    const primaryImg = image || imageUrl || '';
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

    // Also persist individual variants into product_variants table if provided
    if (Array.isArray(variants) && variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const vg = variants[i];
        if (Array.isArray(vg.options)) {
          for (let j = 0; j < vg.options.length; j++) {
            const opt = vg.options[j];
            const varId = `var-${id.replace('prod-', '')}-${i}-${j}`;
            const varSku = `${sku}-${(vg.type || 'V').slice(0, 1).toUpperCase()}${j + 1}`;
            try {
              await pool.execute(
                `INSERT INTO product_variants (
                  id, product_id, title, sku, attributes, price_extra, stock_quantity, barcode, is_active
                ) VALUES (?, ?, ?, ?, ?, 0.00, ?, ?, TRUE)
                ON DUPLICATE KEY UPDATE
                  title = VALUES(title),
                  attributes = VALUES(attributes),
                  stock_quantity = VALUES(stock_quantity),
                  updated_at = CURRENT_TIMESTAMP`,
                [
                  varId,
                  id,
                  `${name} - ${vg.name || vg.type}: ${opt}`,
                  varSku,
                  JSON.stringify({ group: vg.name || vg.type, option: opt }),
                  Math.max(1, Math.floor(parseInt(finalStock, 10) / (vg.options.length || 1))),
                  `BAR-${sku}-${j + 1}`,
                ]
              );
            } catch (varErr) {
              console.warn('[API Products POST] Variant upsert note:', varErr);
            }
          }
        }
      }
    }

    // Record inventory audit trail into stock_movements table
    try {
      const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.execute(
        `INSERT INTO stock_movements (
          id, product_id, sku, type, quantity, previous_stock, new_stock, reason, created_by
        ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, 0, ?, ?, 'CATALOG_EDITOR')`,
        [
          movementId,
          id,
          sku,
          parseInt(finalStock, 10),
          parseInt(finalStock, 10),
          'Mise à jour du stock catalogue via l interface produit',
        ]
      );
    } catch (movErr) {
      console.warn('[API Products POST] Stock movement log note:', movErr);
    }

    // Broadcast live update across all connected dashboards
    try {
      const { realtimeHub } = await import('@/lib/realtime-events');
      realtimeHub.broadcast({
        eventType: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: id,
        title: `Produit "${name}" mis à jour dans le catalogue`,
        payload: { id, name, sku, price: parseFloat(finalPrice), stock: parseInt(finalStock, 10) },
        source: 'PRODUCTS_API',
      }).catch(() => {});
    } catch {}

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
      message: 'Produit, déclinaisons et directives IA enregistrés avec succès dans MySQL !',
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
    const sku = url.searchParams.get('sku');

    if (!id && !sku) {
      return NextResponse.json({ success: false, message: 'ID ou SKU requis' }, { status: 400 });
    }

    const pool = getMysqlPool();

    // 1. Unlink any order items referencing this product to ensure no foreign key conflict occurs and order history is preserved
    try {
      if (id) {
        await pool.execute('UPDATE order_items SET product_id = NULL WHERE product_id = ?', [id]);
      }
      if (sku) {
        await pool.execute('UPDATE order_items SET product_id = NULL WHERE sku = ?', [sku]);
      }
    } catch (unlinkErr) {
      console.warn('[API Products DELETE] Note unlinking order_items:', unlinkErr);
    }

    // 2. Cascade delete variants and stock movements for complete database cleanup
    try {
      if (id) {
        await pool.execute('DELETE FROM product_variants WHERE product_id = ?', [id]);
        await pool.execute('DELETE FROM stock_movements WHERE product_id = ?', [id]);
      }
      if (sku) {
        await pool.execute('DELETE FROM product_variants WHERE sku = ?', [sku]);
      }
    } catch (cascadeErr) {
      console.warn('[API Products DELETE] Note cascading variant/stock deletion:', cascadeErr);
    }

    // 3. Perform TRUE MySQL DELETION from products table
    let deleteSql = 'DELETE FROM products WHERE ';
    const params: any[] = [];
    if (id && sku) {
      deleteSql += 'id = ? OR sku = ?';
      params.push(id, sku);
    } else if (id) {
      deleteSql += 'id = ?';
      params.push(id);
    } else {
      deleteSql += 'sku = ?';
      params.push(sku);
    }

    const [result]: any = await pool.execute(deleteSql, params);
    const affected = result?.affectedRows || 0;
    console.log(`[API Products DELETE] Real delete executed for id=${id}, sku=${sku}. Affected rows: ${affected}`);

    // 3. Remove cleanly from memory store and WhatsApp AI catalog
    if (id) deleteProductFromStore(id);
    if (sku) deleteProductFromStore(sku);

    return NextResponse.json({
      success: true,
      message: 'تم حذف المنتج نهائياً من قاعدة البيانات بنجاح',
      deletedId: id,
      deletedSku: sku,
      affectedRows: affected,
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
