const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

// Create a MongoDB client
let client;

async function connect() {
  try {
    // Connect to the MongoDB server
    client = new MongoClient(CONSTANTS.DB_CONNECTION_URI, {
      maxPoolSize: 1,
      maxConnecting: 2,
    });
    await client.connect();
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

async function getDB() {
  try {
    if (client) {
      // Return the database reference
      return client.db(CONSTANTS.DB_NAME);
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

module.exports = {
  connect,
  getDB,
};
