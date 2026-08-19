const crypto = require('crypto');
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
  async byInstitute(institute) {
    const db = await getDb();
    return db.collection('professors').find({ institute }).sort({ name: 1 }).toArray();
  },
  async getByShareToken(token) {
    const db = await getDb();
    return db.collection('professors').findOne({ shareToken: token });
  },
  // Public tribute links are generated lazily so professors created before this
  // feature existed still get a token the first time it's requested.
  async ensureShareToken(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    const prof = await db.collection('professors').findOne({ _id });
    if (!prof) return null;
    if (prof.shareToken) return prof.shareToken;
    const shareToken = crypto.randomBytes(12).toString('hex');
    await db.collection('professors').updateOne({ _id }, { $set: { shareToken } });
    return shareToken;
  },
  async create({ institute, name, designation, email, photoPath }) {
    const db = await getDb();
    const doc = {
      institute,
      name,
      designation,
      email: email || null,
      photoPath,
      shareToken: crypto.randomBytes(12).toString('hex'),
      createdAt: new Date().toISOString()
    };
    const { insertedId } = await db.collection('professors').insertOne(doc);
    return { ...doc, _id: insertedId };
  },
  async update(id, patch) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    await db.collection('professors').updateOne({ _id }, { $set: patch });
    return db.collection('professors').findOne({ _id });
  },
  async remove(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    const prof = await db.collection('professors').findOne({ _id });
    if (!prof) return null;
    await db.collection('professors').deleteOne({ _id });
    return prof;
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
      profPhotoPath: prof.photoPath,
      type,
      message: message || null,
      filePath: filePath || null,
      fileName: fileName || null,
      fontFamily: fontFamily || 'Georgia, serif',
      textColor: textColor || '#2c1810',
      fontSize: fontSize || '26px',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const { insertedId } = await db.collection('submissions').insertOne(doc);
    return { ...doc, _id: insertedId };
  },
  async setStatus(id, status) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    await db.collection('submissions').updateOne({ _id }, { $set: { status } });
    return db.collection('submissions').findOne({ _id });
  }
};

module.exports = { professors, submissions };
