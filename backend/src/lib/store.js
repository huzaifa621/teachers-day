const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

const toId = (id) => {
  try { return new ObjectId(id); } catch (_) { return null; }
};

const professors = {
  async all() {
    const db = await getDb();
    return db.collection('professors').find({}).sort({ institute: 1, name: 1 }).toArray();
  },
  async get(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    return db.collection('professors').findOne({ _id });
  },
  async create({ institute, instituteCode, name, dept, email, photoPath }) {
    const db = await getDb();
    const doc = {
      institute,
      instituteCode: instituteCode || null,
      name,
      dept,
      email: email || null,
      photoPath,
      createdAt: new Date().toISOString()
    };
    const { insertedId } = await db.collection('professors').insertOne(doc);
    return { ...doc, _id: insertedId };
  }
};

const submissions = {
  async all() {
    const db = await getDb();
    return db.collection('submissions').find({}).sort({ createdAt: -1 }).toArray();
  },
  async get(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    return db.collection('submissions').findOne({ _id });
  },
  async byProfessor(profId) {
    const db = await getDb();
    return db.collection('submissions').find({ profId: String(profId) }).sort({ createdAt: 1 }).toArray();
  },
  async create({ studentName, studentInstitute, prof, type, message, filePath, fileName, fontFamily, textColor, fontSize }) {
    const db = await getDb();
    const doc = {
      studentName,
      studentInstitute,
      profId: String(prof._id),
      profName: prof.name,
      profInstitute: prof.institute,
      type,
      message: message || null,
      filePath: filePath || null,
      fileName: fileName || null,
      fontFamily: fontFamily || 'Georgia, serif',
      textColor: textColor || '#2c1810',
      fontSize: fontSize || '26px',
      createdAt: new Date().toISOString()
    };
    const { insertedId } = await db.collection('submissions').insertOne(doc);
    return { ...doc, _id: insertedId };
  },
  async deleteAll() {
    const db = await getDb();
    await db.collection('submissions').deleteMany({});
  }
};

const clearAll = async () => {
  const db = await getDb();
  await db.collection('submissions').deleteMany({});
  await db.collection('professors').deleteMany({});
};

module.exports = { professors, submissions, clearAll };
