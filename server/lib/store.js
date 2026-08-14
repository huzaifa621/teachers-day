const crypto = require('crypto');
const db = require('./db');

const newId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const professors = {
  all() {
    return db.prepare('SELECT * FROM professors ORDER BY institute, name').all();
  },
  get(id) {
    return db.prepare('SELECT * FROM professors WHERE id = ?').get(id);
  },
  create({ institute, instituteCode, name, dept, email, photoPath }) {
    const id = newId('prof');
    const created_at = new Date().toISOString();
    db.prepare(`
      INSERT INTO professors (id, institute, institute_code, name, dept, email, photo_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, institute, instituteCode || null, name, dept, email || null, photoPath, created_at);
    return professors.get(id);
  }
};

const submissions = {
  all() {
    return db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
  },
  get(id) {
    return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  },
  byProfessor(profId) {
    return db.prepare('SELECT * FROM submissions WHERE prof_id = ? ORDER BY created_at ASC').all(profId);
  },
  create({ studentName, studentInstitute, prof, type, message, filePath, fileName, fontFamily, textColor, fontSize }) {
    const id = newId('sub');
    const created_at = new Date().toISOString();
    db.prepare(`
      INSERT INTO submissions
        (id, student_name, student_institute, prof_id, prof_name, prof_institute, type, message, file_path, file_name, font_family, text_color, font_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, studentName, studentInstitute, prof.id, prof.name, prof.institute,
      type, message || null, filePath || null, fileName || null,
      fontFamily || 'Georgia, serif', textColor || '#2c1810', fontSize || '26px', created_at
    );
    return submissions.get(id);
  },
  deleteAll() {
    db.prepare('DELETE FROM submissions').run();
  }
};

const clearAll = () => {
  db.prepare('DELETE FROM submissions').run();
  db.prepare('DELETE FROM professors').run();
};

module.exports = { professors, submissions, clearAll };
