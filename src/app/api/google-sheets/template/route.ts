import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bom = '\uFEFF';
  const csvContent = `${bom}Date,ID Commande,Nom Client,Téléphone,Ville,Adresse,Code SKU,Produit,Quantité,Prix Total COD (MAD),Remarques
2026-10-31,#CMD-101,Youssef El Amrani,0661998877,Marrakech,"Guéliz, Immeuble Atlas, Appt 6",BMB-BLK-L,خف جلد طبيعي أصلي (KHUF CUIR),1,179,Appeler avant 14h pour confirmation
2026-10-31,#CMD-102,Amina Benjelloun,0672112233,Fès,"Route Ain Chkef, Résidence Narjiss",BMB-BLK-L,خف جلد طبيعي أصلي (KHUF CUIR),2,269,Livraison rapide souhaitée
2026-10-31,#CMD-103,Tariq Alami,0654334455,Casablanca,"Bd Zerktouni, Quartier Maârif",BMB-BLK-L,خف جلد طبيعي أصلي (KHUF CUIR),1,179,Paiement espèces COD à la livraison
2026-10-31,#CMD-104,Houda Tazi,0663778899,Tanger,"Tanger Balia, Complexe Ennasr",BMB-BLK-L,خف جلد طبيعي أصلي (KHUF CUIR),3,340,Confirmer par WhatsApp Darija
2026-10-31,#CMD-105,Karim Bennani,0611223344,Rabat,"Agdal, Rue Oukaimeden, Imm 12",BMB-BLK-L,خف جلد طبيعي أصلي (KHUF CUIR),1,179,Livrer l'après-midi après 16h
`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Modele_Commandes_GoogleSheets_SENDIT.csv"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
