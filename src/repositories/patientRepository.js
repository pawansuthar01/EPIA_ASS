const fs = require('node:fs');
const path = require('node:path');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
const dataFile = path.resolve(process.env.PATIENTS_FILE || path.join(dataDirectory, 'patients.json'));

function getAll() {
  try {
    const patients = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return Array.isArray(patients) ? patients : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveAll(patients) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(patients, null, 2));
  fs.renameSync(temporaryFile, dataFile);
}

module.exports = { getAll, saveAll };
