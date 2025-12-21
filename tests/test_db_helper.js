const db = require('../models');
const seedData = require('../scripts/seed_data'); // Import the new seeding script

const resetAndSeedDatabase = async () => {
  console.log("\n--- Resetting and Seeding Database for Tests ---");
  try {
    // Call the comprehensive seeding script
    await seedData();
    console.log("--- Test Database Reset and Seed Complete ---\n");
  } catch (error) {
    console.error("Error during test database reset and seed:", error);
    throw error;
  }
};

module.exports = resetAndSeedDatabase;
