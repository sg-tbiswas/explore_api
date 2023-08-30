const RETS = require("node-rets");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require('./constants');
const retsClient = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});

const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db(CONSTANTS.DB_NAME); 
    return db;
  } catch (error) {
    throw new Error('Database connection failed');
  }
}

async function disconnectFromDatabase() {
  try {
    if (client.isConnected()) {
      await client.close();
      db = null;
    }
  } catch (error) {
    throw new Error('Error disconnecting from the database');
  }
}

module.exports = Object.freeze({
  RETS_CLIENT: retsClient,
  getTodayDate,
  connectToDatabase,
  disconnectFromDatabase
});