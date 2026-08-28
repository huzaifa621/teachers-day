// One-off migration: "professors" -> "faculty".
//
// Four changes to existing data:
//   1. professors collection            -> faculty collection
//   2. institute: "IIT Delhi" (string)  -> institutes: ["IIT Delhi"] (array)
//   3. designation                      -> dropped
//   4. submissions: profId/profName/profInstitute/profPhotoPath
//                                       -> facultyId/facultyName/facultyInstitute/facultyPhotoPath
//
// Email becomes the unique identifier for a faculty member, so the script
// refuses to finish while any record has a blank or duplicated email — it
// prints exactly which ones, since only a human can decide what the right
// address is. Fix those, then re-run. The app creates a unique index on
// email at startup (see src/lib/db.js) and would otherwise crash on boot.
//
// Safe to run more than once: every step is a no-op once applied.
//
// Usage, from backend/ with the production .env in place:
//   node scripts/migrate-faculty.js          # report only, changes nothing
//   node scripts/migrate-faculty.js --apply  # actually migrate

require('dotenv').config();
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'teachers_day');

  const names = (await db.listCollections().toArray()).map((c) => c.name);
  const hasOld = names.includes('professors');
  const hasNew = names.includes('faculty');

  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  console.log(`collections: professors=${hasOld} faculty=${hasNew}\n`);

  if (!hasOld && !hasNew) {
    console.log('Nothing to migrate — neither collection exists.');
    return client.close();
  }

  // --- 1. rename the collection ------------------------------------------
  if (hasOld && hasNew) {
    console.error('Both "professors" and "faculty" exist. Refusing to guess which is');
    console.error('current — merge or drop one by hand, then re-run.');
    process.exitCode = 1;
    return client.close();
  }
  if (hasOld) {
    console.log('professors -> faculty (rename collection)');
    if (APPLY) await db.renameCollection('professors', 'faculty');
  }

  const facultyCol = db.collection('faculty');
  const subsCol = db.collection('submissions');

  // --- 2. email must be present and unique -------------------------------
  // Checked before writing anything else, so a bad dataset stops the run
  // early rather than half-way through.
  const members = APPLY || hasNew ? await facultyCol.find({}).toArray() : await db.collection('professors').find({}).toArray();

  const blank = members.filter((m) => !m.email || !String(m.email).trim());
  const seen = new Map();
  const dupes = [];
  for (const m of members) {
    const email = String(m.email || '').trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) dupes.push([seen.get(email), m]);
    else seen.set(email, m);
  }

  if (blank.length || dupes.length) {
    console.error(`\nCannot enforce unique emails yet — ${blank.length} blank, ${dupes.length} duplicated.\n`);
    for (const m of blank) {
      console.error(`  BLANK  ${String(m._id)}  ${m.name}  [${m.institutes || m.institute}]`);
    }
    for (const [a, b] of dupes) {
      console.error(`  DUPE   ${String(a._id)} "${a.name}" and ${String(b._id)} "${b.name}" both use ${b.email}`);
    }
    console.error('\nFix these in the database, then re-run. Nothing else was changed.');
    process.exitCode = 1;
    return client.close();
  }
  console.log(`emails: ${members.length} records, all present and unique`);

  // --- 3. institute (string) -> institutes (array), drop designation ------
  const needsShape = members.filter((m) => m.institute !== undefined || m.designation !== undefined || !Array.isArray(m.institutes));
  console.log(`faculty needing institute/designation reshape: ${needsShape.length}`);
  if (APPLY) {
    for (const m of needsShape) {
      const institutes = Array.isArray(m.institutes) && m.institutes.length
        ? m.institutes
        : [m.institute].filter(Boolean);
      await facultyCol.updateOne(
        { _id: m._id },
        {
          $set: { institutes, email: String(m.email).trim().toLowerCase() },
          $unset: { institute: '', designation: '' }
        }
      );
    }
  }

  // --- 4. submission field renames ---------------------------------------
  const legacySubs = await subsCol.countDocuments({ profId: { $exists: true } });
  console.log(`submissions needing field rename: ${legacySubs}`);
  if (APPLY && legacySubs > 0) {
    await subsCol.updateMany(
      { profId: { $exists: true } },
      {
        $rename: {
          profId: 'facultyId',
          profName: 'facultyName',
          profInstitute: 'facultyInstitute',
          profPhotoPath: 'facultyPhotoPath'
        }
      }
    );
  }

  // --- 5. indexes --------------------------------------------------------
  if (APPLY) {
    // Drop the old institute index if the rename carried it over; the app
    // recreates the right ones on boot.
    const idx = await facultyCol.indexes();
    for (const i of idx) {
      if (i.key && i.key.institute !== undefined) {
        console.log(`dropping stale index ${i.name}`);
        await facultyCol.dropIndex(i.name);
      }
    }
    await facultyCol.createIndex({ institutes: 1, name: 1 });
    await facultyCol.createIndex({ email: 1 }, { unique: true });
    await subsCol.createIndex({ facultyId: 1 });
  }

  console.log(APPLY ? '\nDone.' : '\nDry run only — re-run with --apply to write these changes.');
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
