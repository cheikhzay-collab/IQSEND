import { NextResponse } from 'next/server';

export async function GET() {
  const bom = '\uFEFF';
  const csvContent = `${bom}Date,Nom Client,Téléphone,Ville,Adresse,Produit,Quantité,Prix COD (MAD),Remarques
2026-10-20,Youssef El Amrani,0661998877,Marrakech,"Guéliz, Immeuble Atlas, Appt 6",Montre Luxe Or Noir,1,349,Appeler avant 14h
2026-10-20,Amina Benjelloun,0672112233,Fès,"Route Ain Chkef, Résidence Narjiss",Pack Caftan Moderne,1,490,Livraison rapide souhaitée
2026-10-20,Tariq Alami,0654334455,Casablanca,"Bd Zerktouni, Quartier Maârif",Sneakers Sport Élite,2,598,Paiement espèces COD
2026-10-20,Houda Tazi,0663778899,Tanger,"Tanger Balia, Complexe Ennasr",Sac Cuir Artisanal,1,380,Confirmation via WhatsApp
2026-10-20,Karim Bennani,0611223344,Rabat,"Agdal, Rue Oukaimeden, Imm 12",Pack Soins Bio Maroc,1,299,Livrer l'après-midi
`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Modele_Commandes_SENDIT_Maroc.csv"',
      'Cache-Control': 'no-cache',
    },
  });
}
