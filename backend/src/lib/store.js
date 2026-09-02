const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

const toId = (id) => {
  try { return new ObjectId(id); } catch (_) { return null; }
};

const faculty = {
  async all() {
    const db = await getDb();
    return db.collection('faculty').find({}).sort({ name: 1 }).toArray();
  },
  async get(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    return db.collection('faculty').findOne({ _id });
  },
  // `institutes` is an array, and Mongo matches a scalar against any element,
  // so this finds every faculty member affiliated with the institute.
  async byInstitute(institute) {
    const db = await getDb();
    return db.collection('faculty').find({ institutes: institute }).sort({ name: 1 }).toArray();
  },
  // Email is the unique identifier for a faculty member (see the unique index
  // in db.js) — used to reject duplicates on create and on edit.
  async byEmail(email) {
    const db = await getDb();
    return db.collection('faculty').findOne({ email: email.toLowerCase() });
  },
  async getByShareToken(token) {
    const db = await getDb();
    return db.collection('faculty').findOne({ shareToken: token });
  },
  // Public tribute links are generated lazily so faculty created before this
  // feature existed still get a token the first time it's requested.
  async ensureShareToken(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    const member = await db.collection('faculty').findOne({ _id });
    if (!member) return null;
    if (member.shareToken) return member.shareToken;
    const shareToken = crypto.randomBytes(12).toString('hex');
    await db.collection('faculty').updateOne({ _id }, { $set: { shareToken } });
    return shareToken;
  },
  async create({ institutes, name, email, photoPath }) {
    const db = await getDb();
    const doc = {
      institutes,
      name,
      // Lowercased so the unique index treats Ada@x.edu and ada@x.edu as one
      // person — otherwise "unique identifier" would be case-dependent.
      email: email.toLowerCase(),
      photoPath,
      shareToken: crypto.randomBytes(12).toString('hex'),
      createdAt: new Date().toISOString()
    };
    const { insertedId } = await db.collection('faculty').insertOne(doc);
    return { ...doc, _id: insertedId };
  },
  async update(id, patch) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    await db.collection('faculty').updateOne({ _id }, { $set: patch });
    return db.collection('faculty').findOne({ _id });
  },
  async remove(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    const member = await db.collection('faculty').findOne({ _id });
    if (!member) return null;
    await db.collection('faculty').deleteOne({ _id });
    return member;
  }
};

// Soft-deleted submissions are never returned by any of these — the record
// stays in Mongo (deleted: true) but disappears from every app-facing view,
// including downloads, public tribute pages, and the links export.
const NOT_DELETED = { deleted: { $ne: true } };

const submissions = {
  async all() {
    const db = await getDb();
    return db.collection('submissions').find(NOT_DELETED).sort({ createdAt: -1 }).toArray();
  },
  async get(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    return db.collection('submissions').findOne({ _id, ...NOT_DELETED });
  },
  async byFaculty(facultyId) {
    const db = await getDb();
    return db.collection('submissions').find({ facultyId: String(facultyId), ...NOT_DELETED }).sort({ createdAt: 1 }).toArray();
  },
  async create({ studentName, studentInstitute, member, type, message, filePath, fileName, fontFamily, textColor, fontSize, deviceId, ip }) {
    const db = await getDb();
    const doc = {
      studentName,
      studentInstitute,
      facultyId: String(member._id),
      facultyName: member.name,
      // A faculty member can belong to several institutes, but a tribute is
      // always made through exactly one of them — the institute the student
      // logged in with, which is why they could see this faculty at all. That
      // single institute is what the galleries group by.
      facultyInstitute: studentInstitute,
      facultyPhotoPath: member.photoPath,
      type,
      message: message || null,
      filePath: filePath || null,
      fileName: fileName || null,
      fontFamily: fontFamily || 'Georgia, serif',
      textColor: textColor || '#2c1810',
      fontSize: fontSize || '26px',
      status: 'pending',
      // Not shown to students — admin-only signal for spotting who submitted
      // what. deviceId is a browser-persisted random id (see
      // frontend/lib/deviceId.js); ip is captured server-side and changes
      // with the student's network, so it's a weaker, supporting signal.
      deviceId: deviceId || null,
      ip: ip || null,
      deleted: false,
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
  },
  // Soft delete — the row stays in Mongo (for audit/recovery) with deleted:
  // true, just excluded from every read above.
  async softDelete(id) {
    const _id = toId(id);
    if (!_id) return null;
    const db = await getDb();
    const result = await db.collection('submissions').updateOne({ _id }, { $set: { deleted: true, deletedAt: new Date().toISOString() } });
    return result.matchedCount > 0;
  }
};

module.exports = { faculty, submissions };
