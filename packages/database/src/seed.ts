import { prisma } from './index';
import bcrypt from 'bcryptjs';

const sampleFragrances = [
  {
    name: "Sauvage",
    brand: "Dior",
    year: 2015,
    concentration: "EDT",
    topNotes: ["Bergamot", "Pepper"],
    middleNotes: ["Sichuan Pepper", "Lavender", "Pink Pepper", "Vetiver", "Patchouli", "Geranium", "Elemi"],
    baseNotes: ["Ambroxan", "Cedar", "Labdanum"],
    aiSeasons: ["Spring", "Summer", "Fall"],
    aiOccasions: ["Daily", "Casual", "Work"],
    aiMoods: ["Fresh", "Confident"],
    fragranticaSeasons: ["Spring", "Summer", "Fall"],
    communityRating: 4.2,
    verified: true,
    longevity: 7,
    sillage: 8,
    projection: 8
  },
  {
    name: "Bleu de Chanel",
    brand: "Chanel",
    year: 2010,
    concentration: "EDT",
    topNotes: ["Lemon", "Bergamot", "Grapefruit", "Mint"],
    middleNotes: ["Ginger", "Nutmeg", "Jasmine", "Melon"],
    baseNotes: ["Incense", "Vetiver", "Cedar", "Sandalwood", "Patchouli", "Labdanum"],
    aiSeasons: ["Spring", "Summer", "Fall"],
    aiOccasions: ["Daily", "Work", "Formal"],
    aiMoods: ["Fresh", "Sophisticated", "Confident"],
    fragranticaSeasons: ["Spring", "Summer", "Fall"],
    communityRating: 4.3,
    verified: true,
    longevity: 6,
    sillage: 7,
    projection: 7
  },
  {
    name: "Aventus",
    brand: "Creed",
    year: 2010,
    concentration: "EDP",
    topNotes: ["Pineapple", "Bergamot", "Black Currant", "Apple"],
    middleNotes: ["Birch", "Patchouli", "Moroccan Jasmine", "Rose"],
    baseNotes: ["Musk", "Oak Moss", "Ambergris", "Vanilla"],
    aiSeasons: ["Spring", "Summer", "Fall"],
    aiOccasions: ["Evening", "Formal", "Date"],
    aiMoods: ["Confident", "Sophisticated"],
    fragranticaSeasons: ["Spring", "Summer", "Fall"],
    communityRating: 4.5,
    verified: true,
    longevity: 9,
    sillage: 9,
    projection: 9
  },
  {
    name: "Tom Ford Oud Wood",
    brand: "Tom Ford",
    year: 2007,
    concentration: "EDP",
    topNotes: ["Oud", "Rosewood", "Cardamom"],
    middleNotes: ["Sandalwood", "Sichuan Pepper", "Saffron"],
    baseNotes: ["Vanilla", "Amber"],
    aiSeasons: ["Fall", "Winter"],
    aiOccasions: ["Evening", "Formal", "Date"],
    aiMoods: ["Sophisticated", "Romantic"],
    fragranticaSeasons: ["Fall", "Winter"],
    communityRating: 4.1,
    verified: true,
    longevity: 8,
    sillage: 6,
    projection: 6
  },
  {
    name: "Eros",
    brand: "Versace",
    year: 2012,
    concentration: "EDT",
    topNotes: ["Mint", "Green Apple", "Lemon"],
    middleNotes: ["Ambroxan", "Geranium", "Clary Sage"],
    baseNotes: ["Vanilla", "Vetiver", "Oakmoss", "Sandalwood", "Tonka Bean"],
    aiSeasons: ["Spring", "Summer", "Fall"],
    aiOccasions: ["Daily", "Casual", "Date", "Evening"],
    aiMoods: ["Fresh", "Confident", "Seductive"],
    fragranticaSeasons: ["Spring", "Summer", "Fall"],
    communityRating: 4.0,
    verified: true,
    longevity: 7,
    sillage: 8,
    projection: 8,
    popularityScore: 8.5
  },
  {
    name: "Eros Flame",
    brand: "Versace",
    year: 2018,
    concentration: "EDP",
    topNotes: ["Mandarin", "Madagascar Black Pepper", "Rosemary", "Lemon"],
    middleNotes: ["Geranium", "Rose", "Pepperwood"],
    baseNotes: ["Vanilla", "Tonka Bean", "Sandalwood", "Patchouli"],
    aiSeasons: ["Fall", "Winter", "Spring"],
    aiOccasions: ["Date", "Evening", "Formal"],
    aiMoods: ["Seductive", "Confident", "Warm"],
    fragranticaSeasons: ["Fall", "Winter", "Spring"],
    communityRating: 4.2,
    verified: true,
    longevity: 8,
    sillage: 7,
    projection: 7,
    popularityScore: 8.0
  },
  {
    name: "Eros Energy",
    brand: "Versace",
    year: 2021,
    concentration: "EDT",
    topNotes: ["Grapefruit", "Lemon", "Mandarin", "Lime"],
    middleNotes: ["Black Pepper", "Cardamom", "Rosemary"],
    baseNotes: ["Amber", "Musk", "Cedarwood", "Vanilla"],
    aiSeasons: ["Spring", "Summer"],
    aiOccasions: ["Daily", "Casual", "Work", "Sport"],
    aiMoods: ["Fresh", "Energetic", "Confident"],
    fragranticaSeasons: ["Spring", "Summer"],
    communityRating: 3.9,
    verified: true,
    longevity: 6,
    sillage: 7,
    projection: 7,
    popularityScore: 7.5
  },
  {
    name: "1 Million",
    brand: "Paco Rabanne",
    year: 2008,
    concentration: "EDT",
    topNotes: ["Grapefruit", "Mint", "Blood Mandarin"],
    middleNotes: ["Cinnamon", "Spicy Notes", "Rose"],
    baseNotes: ["Amber", "Leather", "White Wood"],
    aiSeasons: ["Fall", "Winter"],
    aiOccasions: ["Evening", "Date", "Party"],
    aiMoods: ["Confident", "Seductive", "Bold"],
    fragranticaSeasons: ["Fall", "Winter"],
    communityRating: 4.1,
    verified: true,
    longevity: 7,
    sillage: 8,
    projection: 8,
    popularityScore: 8.2
  },
  {
    name: "Invictus",
    brand: "Paco Rabanne",
    year: 2013,
    concentration: "EDT",
    topNotes: ["Marine Accord", "Grapefruit", "Mandarin"],
    middleNotes: ["Jasmine", "Bay Leaf", "Hedione"],
    baseNotes: ["Ambergris", "Guaiac Wood", "Patchouli"],
    aiSeasons: ["Spring", "Summer"],
    aiOccasions: ["Daily", "Casual", "Sport"],
    aiMoods: ["Fresh", "Confident", "Energetic"],
    fragranticaSeasons: ["Spring", "Summer"],
    communityRating: 3.8,
    verified: true,
    longevity: 6,
    sillage: 7,
    projection: 7,
    popularityScore: 7.8
  },
  {
    name: "Acqua di Gio",
    brand: "Giorgio Armani",
    year: 1996,
    concentration: "EDT",
    topNotes: ["Lime", "Lemon", "Bergamot", "Jasmine", "Orange", "Mandarin", "Neroli"],
    middleNotes: ["Sea Notes", "Jasmine", "Calone", "Peach", "Freesia", "Hiacynth", "Cyclamen", "Violet", "Coriander", "Nutmeg", "Rose"],
    baseNotes: ["White Musk", "Cedar", "Oakmoss", "Amber"],
    aiSeasons: ["Spring", "Summer"],
    aiOccasions: ["Daily", "Casual", "Work"],
    aiMoods: ["Fresh", "Clean", "Confident"],
    fragranticaSeasons: ["Spring", "Summer"],
    communityRating: 4.0,
    verified: true,
    longevity: 5,
    sillage: 6,
    projection: 6,
    popularityScore: 9.0
  },
  {
    name: "La Nuit de L'Homme",
    brand: "Yves Saint Laurent",
    year: 2009,
    concentration: "EDT",
    topNotes: ["Cardamom", "Bergamot"],
    middleNotes: ["Lavender", "Cedar", "Cumin"],
    baseNotes: ["Vetiver", "Caraway"],
    aiSeasons: ["Fall", "Winter", "Spring"],
    aiOccasions: ["Evening", "Date", "Formal"],
    aiMoods: ["Seductive", "Sophisticated", "Romantic"],
    fragranticaSeasons: ["Fall", "Winter", "Spring"],
    communityRating: 4.3,
    verified: true,
    longevity: 6,
    sillage: 7,
    projection: 6,
    popularityScore: 8.5
  }
];

const sampleUsers = [
  {
    email: "admin@fragrancebattle.com",
    username: "admin",
    password: "admin123"
  },
  {
    email: "user1@example.com",
    username: "fragrancelover",
    password: "password123"
  },
  {
    email: "user2@example.com",
    username: "scentexpert",
    password: "password123"
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    await prisma.aICategorFeedback.deleteMany();
    await prisma.battleItem.deleteMany();
    await prisma.battle.deleteMany();
    await prisma.collectionItem.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.fragrance.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️  Cleared existing data');

    // Seed users
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        passwordHash: await bcrypt.hash(user.password, 10)
      }))
    );

    const createdUsers = await Promise.all(
      hashedUsers.map(async (user) => {
        const { password, ...userData } = user;
        return await prisma.user.create({
          data: userData
        });
      })
    );

    console.log(`👥 Created ${createdUsers.length} users`);

    // Seed fragrances
    const createdFragrances = await Promise.all(
      sampleFragrances.map(async (fragrance) => {
        return await prisma.fragrance.create({
          data: fragrance
        });
      })
    );

    console.log(`🌸 Created ${createdFragrances.length} fragrances`);

    // Create collections for users
    const collections = await Promise.all(
      createdUsers.map(async (user, index) => {
        return await prisma.collection.create({
          data: {
            userId: user.id,
            name: `${user.username}'s Collection`,
            description: `Personal fragrance collection for ${user.username}`
          }
        });
      })
    );

    console.log(`📚 Created ${collections.length} collections`);

    // Add fragrances to collections
    for (const collection of collections) {
      // Add 2-3 random fragrances to each collection
      const randomFragrances = createdFragrances
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 2);

      for (const fragrance of randomFragrances) {
        await prisma.collectionItem.create({
          data: {
            collectionId: collection.id,
            fragranceId: fragrance.id,
            personalRating: Math.floor(Math.random() * 5) + 6, // 6-10 rating
            personalNotes: `Great fragrance! Love the ${fragrance.topNotes[0]} opening.`,
            bottleSize: ['30ml', '50ml', '100ml'][Math.floor(Math.random() * 3)]
          }
        });
      }
    }

    console.log('📝 Added fragrances to collections');

    // Create a sample battle (only if we have users and fragrances)
    if (createdUsers.length > 0 && createdFragrances.length >= 3) {
      const battle = await prisma.battle.create({
        data: {
          userId: createdUsers[0]!.id,
          title: "Designer vs Niche Fragrances",
          description: "Which fragrance do you prefer in a blind test?",
          status: "ACTIVE"
        }
      });

      // Add fragrances to the battle
      const battleFragrances = createdFragrances.slice(0, 3);
      for (let i = 0; i < battleFragrances.length; i++) {
        await prisma.battleItem.create({
          data: {
            battleId: battle.id,
            fragranceId: battleFragrances[i]!.id,
            position: i + 1,
            votes: Math.floor(Math.random() * 10) + 1
          }
        });
      }
    }

    console.log('⚔️  Created sample battle');

    console.log('✅ Database seed completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
