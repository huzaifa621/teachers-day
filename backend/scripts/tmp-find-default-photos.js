require('dotenv').config();
const { faculty } = require('../src/lib/store');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });

(async () => {
  const all = await faculty.all();
  const byEtag = new Map();

  for (const f of all) {
    if (!f.photoPath) continue;
    try {
      const out = await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: f.photoPath }));
      const etag = out.ETag;
      const size = out.ContentLength;
      const key = `${etag}|${size}`;
      if (!byEtag.has(key)) byEtag.set(key, { etag, size, members: [] });
      byEtag.get(key).members.push(f);
    } catch (err) {
      console.error(`HEAD failed for ${f.name} (${f.photoPath}): ${err.message}`);
    }
  }

  const groups = [...byEtag.values()].filter((g) => g.members.length > 1)
    .sort((a, b) => b.members.length - a.members.length);

  console.log(`Total faculty with a photo: ${all.filter(f => f.photoPath).length}`);
  console.log(`Distinct image groups shared by >1 faculty: ${groups.length}\n`);

  for (const g of groups) {
    const institutes = new Set();
    g.members.forEach((m) => (m.institutes || []).forEach((i) => institutes.add(i)));
    console.log(`--- Shared image (etag=${g.etag}, size=${g.size} bytes) used by ${g.members.length} faculty ---`);
    console.log(`Institutes involved: ${[...institutes].join(', ')}`);
    console.log(`Sample photoPaths: ${[...new Set(g.members.map(m => m.photoPath))].slice(0, 5).join(', ')}`);
    console.log(`Names: ${g.members.map(m => m.name).join(', ')}`);
    console.log();
  }

  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
