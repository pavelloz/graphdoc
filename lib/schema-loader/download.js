const fs = require("fs");
const path = require("path");
const url = require("url");
const exec = require("child_process").exec;

const pkgDir = require("pkg-dir");
const request = require("request-promise");

async function init(file_url) {
  const ROOT_DIR = await pkgDir(__dirname);
  const DOWNLOAD_DIR = `${ROOT_DIR}/.tmp`;
  const mkdir = `mkdir -p ${DOWNLOAD_DIR}`;

  const file_name = url.parse(file_url).pathname.split('/').pop(); // prettier-ignore
  const filepath = `${DOWNLOAD_DIR}/${file_name}`;

  return new Promise((resolve, reject) => {
    exec(mkdir, function(err, stdout, stderr) {
      if (err) reject(err);

      request(file_url).then(function(schema) {
        const file = fs.createWriteStream(filepath);
        file.write(schema);
        file.on("close", function() {
          resolve(filepath);
        });
        file.end();
      });
    });
  });
}

module.exports = init;
