const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

// Create a MongoDB client
const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);

async function connect() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to the database');
    
    // Return the database reference
    return client.db(CONSTANTS.DB_NAME);
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
}

const db = connect(); // Connect when the module is imported
module.exports = db;