const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

class Database {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(CONSTANTS.DB_CONNECTION_URI, {
        maxPoolSize: 1,
        maxConnecting: 2,
      });
      await this.client.connect();
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

module.exports = Database;
