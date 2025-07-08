import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Standard concentration mapping
const concentrationMappings = {
  // Eau de Cologne variations → Eau de Cologne
  'Eau de Cologne': [
    'Cologne',
    'Eau de Cologne Concentrée',
    'Eau de Cologne Concentré',
    'Concentrated Cologne',
    'Ultra Cologne',
    'Fresh Eau de Cologne',
    'Light Cologne',
    'Super Cologne',
    'Super Eau de Cologne',
    'Cologne Concentrée',
    'Perfume Cologne',
    'Perfumed Cologne',
    'Dual Cologne',
    'Eau de Cologne Triple',
    'Alcohol-Free Cologne',
    'Body Cologne',
    'Summer Light Cologne',
    'Delicate Cologne',
    'Eau de Cologne Parfumée',
    'Cologne Parfumée',
    'Shower Cologne',
    'Cologne Après Sport',
    'Agua de Colonia',
    'Acqua di Colonia',
    'Colonia',
    'Toilet Water'
  ],

  // Eau de Toilette variations → Eau de Toilette
  'Eau de Toilette': [
    'Parfum de Toilette',
    'Eau de Toilette Intense',
    'Eau de Toilette Concentrée',
    'Eau de Toilette Fraîche',
    'Eau de Toilette Concentrate',
    'Hydrating Eau de Toilette',
    'Eau de Toilette Light',
    'Eau de Toilette Lumière',
    'Concentrated Eau de Toilette',
    'Eau de Toilette Magic',
    'Eau de Toilette Opalisée',
    'Eau de Toilette Originale',
    'Eau de Toilette Rosa',
    'Eau de Toilette Rouge',
    'Eau de Toilette Tendre',
    'Exclusive Concentrate Eau de Toilette',
    'Floral Eau de Toilette',
    'Fresh Eau de Toilette',
    'Gentle Eau de Toilette',
    'L\'Eau de Toilette Rosée',
    'Eau de Toilette Légère',
    'Cristaux en Eau de Toilette',
    'Eau de Toilette Apaisante',
    'Eau de Toilette Bloom of Rose',
    'Eau de Toilette Boisée',
    'Eau de Toilette Cedro',
    'Eau de Toilette Florale'
  ],

  // Eau de Parfum variations → Eau de Parfum
  'Eau de Parfum': [
    'Eau de Parfum Intense',
    'Eau de Parfum Concentrée',
    'Eau de Parfum Extrême',
    'Absolu Eau de Parfum',
    'Eau Parfumée',
    'Eau de Parfum Absolue',
    'Eau de Parfum Florale',
    'Eau Fraiche Parfumée',
    'Eau de Parfum Fraîche',
    'Eau de Parfum Légère',
    'Eau de Parfum Rouge',
    'Eau de Parfum Sensuelle',
    'Eau de Parfum Éclat',
    'Eau de Parfum Nectar',
    'Eau de Parfum Neon',
    'Eau de Parfum Over Red',
    'Eau de Parfum Poudrée',
    'Eau de Parfum Red Maestro',
    'Eau de Parfum Rose Signature',
    'Eau de Parfum Rose Velvet',
    'Eau de Parfum Rouge Ultime',
    'Eau de Parfum Supra Florale',
    'Eau de Parfum Suprême',
    'Eau de Parfum Tendre',
    'Eau de Parfum Very Floral',
    'Eau de Parfum Concentre',
    'Eau de Parfum Boisée',
    'Eau de Parfum Aromatique',
    'Eau de Parfum Ambrée',
    'Luminous Eau de Parfum',
    'Eau d\'Été Parfumée',
    'Eau Parfumée pour le Corps',
    'Eau Parfumée Sans Alcool',
    'Eau Légère Parfumée',
    'Eau de Parfum Essentiel',
    'Eau de Parfum Cristal',
    'Eau de Parfum Grace',
    'Eau de Parfum Illicit Green',
    'Eau de Parfum Couture',
    'Eau de Parfum Lumière',
    'Eau de Parfum Murasaki',
    'Eau de Parfum Naturelle'
  ],

  // Parfum variations → Parfum
  'Parfum': [
    'Pure Parfum',
    'Esprit de Parfum',
    'Essence de Parfum',
    'Extract of Parfum',
    'Parfum Extract',
    'Parfum Extrait',
    'Le Parfum',
    'Concentrated Parfum',
    'Compact Parfum',
    'Body Parfum',
    'Esprit de Parfum Original',
    'Extreme de Parfum',
    'Fleur de Parfum',
    'Secret de Parfum',
    'Confit de Parfum',
    'Perfume',
    'Pure Perfume',
    'Concentrated Perfume',
    'Concentrated Fragrance',
    'Super Perfume',
    'Ultra Perfume',
    'Light Perfume',
    'Profumo',
    'Il Concentrato',
    'Concréta',
    'Concentrato',
    'Estratto',
    'Estratto di Profumo',
    'Estratto Triplo',
    'Extracto',
    'Essence',
    'Fond de Parfum',
    'Fragranza Concentrata',
    'Fragranca Concentrata',
    'Fragrance Concentrée',
    'Parfum Opalisé',
    'Parfum-Serum',
    'Touche de Parfum',
    'Touche Parfumée',
    'Soie de Parfum',
    'Parfumousse',
    'Concrète Parfumée'
  ],

  // Extrait de Parfum variations → Extrait de Parfum
  'Extrait de Parfum': [
    'Extrait',
    'Extrait de Parfum Original',
    'Perfume Extrait',
    'Extrait Intense',
    'Extrait de Aoud',
    'Essenza Assoluta'
  ],

  // Elixir variations → Elixir
  'Elixir': [
    'L\'Elixir Eau de Parfum',
    'Elixir de Parfum'
  ],

  // Perfume Oil variations → Perfume Oil
  'Perfume Oil': [
    'Huile Parfum',
    'Huile de Parfum',
    'Oil Parfum',
    'Essenza in Olio',
    'Pure Perfume Oil',
    'Concentrated Oil',
    'Profumo in Olio',
    'Olio Profumato',
    'Perfume & Bath Oil'
  ],

  // Solid Perfume variations → Solid Perfume
  'Solid Perfume': [
    'Parfum Solide',
    'Solid Parfum',
    'Parfum Stick',
    'Parfum Compact',
    'Solid Cologne',
    'Eau de Cologne Solide',
    'Cologne Stick',
    'Profumo Solido',
    'Solid Fragrance',
    'Solid Scent',
    'Perfume Compact',
    'Perfume Stick',
    'Cushion Perfume',
    'Cush Cush',
    'Intense Solid Perfume',
    'Solid Super Perfume',
    'Ultra Creme Perfume'
  ],

  // Body Spray variations → Body Spray
  'Body Spray': [
    'Fragrance Body Spray',
    'Body Spray Parfum',
    'Body Splash',
    'Body Spritz',
    'Body Spritzer',
    'Body Tonic',
    'Body Cooler',
    'All-Over Spray',
    'All Over Spray',
    'Body & Hair Spray',
    'Body Water',
    'Body Fragrance',
    'Perfume Body Spray',
    'Perfume Spray',
    'Spray Essence'
  ],

  // Fragrance Mist variations → Fragrance Mist
  'Fragrance Mist': [
    'Brume Parfumée',
    'Voile Parfumé',
    'Voile de Parfum',
    'Cologne Mist',
    'Rosée Parfumée Rafraichissante',
    'Brume Hydratante Parfumée pour le Corps',
    'Body Mist',
    'Hair & Body Mist',
    'Hair and Body Mist',
    'Brume Corps',
    'Brume Corps et Cheveux',
    'Brume Corps & Cheveux',
    'Brume Fraîche pour le Corps',
    'Brume Fraîcheur',
    'Brume Concentrée',
    'Brume pour le Corps',
    'Essence Mist',
    'Shimmer Mist',
    'Sheer Perfume Mist',
    'Eau pour le Corps',
    'Eau de Corps',
    'Eau Tonique pour le Corps',
    'Eau Tonique d\'Été pour le Corps',
    'Eau Tonique',
    'Eau de Soin pour le Corps',
    'L\'Eau Scintillante pour le Corps',
    'Eau Fraîche',
    'Eau de Fraîcheur',
    'Eau de Fraîcheur pour le Corps',
    'Eau de Fraîcheur sans Alcool',
    'Eau Légère',
    'Eau Légère sans Alcool',
    'Eau Hydratante sans Alcool',
    'Eau sans Alcool',
    'Eau sans Alcool pour le Soleil',
    'Eau de Paradis pour le Corps sans Alcool',
    'Eau Soyeuse',
    'Eau du Matin',
    'Eau de Velours pour le Corps',
    'Eau de Sport',
    'Eau de Senteur',
    'Eau de Perfume',
    'Fraîcheur Caresse',
    'Friction Tonique pour le Corps',
    'Eau Tonique d\'Été pour le Corps',
    'Water Perfume',
    'Alcohol Free',
    'Alcohol-Free Perfume'
  ],

  // Hair Mist variations → Hair Mist
  'Hair Mist': [
    'Parfum Cheveux',
    'Parfum pour Cheveux',
    'Parfum pour les Cheveux',
    'Hair Perfume',
    'Hair Fragrance',
    'Hair Spray',
    'Hair + Body Perfume',
    'Brume Cheveux',
    'Brume pour Cheveux',
    'Brume pour les Cheveux',
    'Profumo per Capelli'
  ],

  // Attar variations → Attar
  'Attar': [
    'Pure Attar'
  ],

  // Special concentrations (keep as unique)
  'Pura Esencia': ['Pura Esencia'],
  'Fragranza Concentrata': ['Fragranza Concentrata'],
  'Concentration': ['Concentration'],
  'Essence de Fleurs': ['Essence de Fleurs']
};

async function normalizeConcentrations() {
  console.log('🔄 Starting concentration normalization...');

  let totalUpdated = 0;

  for (const [standardName, variations] of Object.entries(concentrationMappings)) {
    for (const variation of variations) {
      console.log(`📝 Normalizing "${variation}" → "${standardName}"`);

      const result = await prisma.fragrance.updateMany({
        where: { concentration: variation },
        data: { concentration: standardName }
      });

      if (result.count > 0) {
        console.log(`   ✅ Updated ${result.count} fragrances`);
        totalUpdated += result.count;
      }
    }
  }

  console.log(`\n🎉 Normalization completed!`);
  console.log(`📊 Total fragrances updated: ${totalUpdated}`);

  // Show final concentration breakdown
  console.log(`\n📋 Final concentration breakdown:`);
  const finalConcentrations = await prisma.fragrance.groupBy({
    by: ['concentration'],
    _count: { concentration: true },
    orderBy: { _count: { concentration: 'desc' } }
  });

  finalConcentrations.forEach(item => {
    console.log(`   ${item.concentration || 'No concentration'}: ${item._count.concentration}`);
  });

  const uniqueConcentrations = finalConcentrations.length;
  console.log(`\n✨ Reduced to ${uniqueConcentrations} unique concentrations (from 100+)`);
}

// CLI runner
if (require.main === module) {
  normalizeConcentrations()
    .then(() => {
      console.log('🎉 Concentration normalization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Normalization failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { normalizeConcentrations };
