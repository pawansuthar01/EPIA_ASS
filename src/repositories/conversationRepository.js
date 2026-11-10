const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(process.env.CONVERSATIONS_FILE || path.join(__dirname, '..', '..', 'data', 'conversations.json'));

function getAll() {
  try {
    const conversations = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(conversations) ? conversations : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveAll(conversations) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporaryFile = `${file}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(conversations, null, 2));
  fs.renameSync(temporaryFile, file);
}

module.exports = { getAll, saveAll };
