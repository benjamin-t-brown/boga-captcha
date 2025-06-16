import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const execAsync = async (command: string) => {
  return new Promise<string>((resolve, reject) => {
    console.log(command);
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err + ',' + stderr);
        return;
      }
      resolve(stdout);
    });
  });
};

function getAllFilePaths(dirPath: string, arrayOfFiles?: string[]) {
  const files = fs.readdirSync(dirPath);

  const arr = arrayOfFiles || [];

  files.forEach(function (file) {
    arr.push(path.join(dirPath, '/', file));
  });

  return arr.filter(path => path.match(/\.js$/));
}

function processCodeFile(text) {
  // remove import statements
  const lastLineInd = text.lastIndexOf('} from ');
  let endImportsInd = lastLineInd;

  if (lastLineInd > -1) {
    while (text[endImportsInd] !== '\n') {
      endImportsInd++;
    }
  }
  const textWithoutImports = text.slice(endImportsInd + 1);

  // remove export statements
  return textWithoutImports.replace(/export /g, '');
}

async function build() {
  console.log('Concat code...');
  const filePaths = getAllFilePaths(path.resolve(__dirname + '/src'));
  console.log('files to concat:\n', filePaths.join('\n '));
  const indexFile = filePaths.reduce((resultFile, currentFilePath) => {
    const currentFile = fs.readFileSync(currentFilePath).toString();
    resultFile += processCodeFile(currentFile);
    return resultFile;
  }, '');

  fs.writeFileSync(`${__dirname}/captcha/index.js`, indexFile);
  await execAsync(`rm -rf src/*.js`);
  console.log('Created captcha/index.js');

  await execAsync(`npx prettier --write captcha/index.js`);
}

build();
