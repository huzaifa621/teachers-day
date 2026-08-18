const { MongoClient } = require('mongodb');

let clientPromise = null;
let dbInstance = null;

function getClient() {
  if (!clientPromise) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set');
    }
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return clientPromise;
}

// Lazy singleton, mirrors the pattern used for the Puppeteer browser —
// avoids reconnecting per request while still tolerating cold starts.
async function getDb() {
  if (!dbInstance) {
    const client = await getClient();
    dbInstance = client.db(process.env.MONGODB_DB_NAME || 'teachers_day');
    await dbInstance.collection('submissions').createIndex({ profId: 1 });
    await dbInstance.collection('submissions').createIndex({ createdAt: -1 });
    await dbInstance.collection('professors').createIndex({ institute: 1, name: 1 });
  }
  return dbInstance;
}

module.exports = { getDb };
