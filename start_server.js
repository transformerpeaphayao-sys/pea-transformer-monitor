const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'next-app');
const realDir = fs.realpathSync.native(targetDir);

process.chdir(realDir);
process.argv = ['node', 'next', 'start', '-p', '3000'];
require(path.join(realDir, 'node_modules', 'next', 'dist', 'bin', 'next'));
