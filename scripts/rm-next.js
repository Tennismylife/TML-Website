const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', '.next');
console.log('Removing', target);

(async () => {
  try {
    await fs.promises.rm(target, { recursive: true, force: true });
    console.log('.next removed');
    process.exit(0);
  } catch (err) {
    console.error('Failed to remove .next:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();