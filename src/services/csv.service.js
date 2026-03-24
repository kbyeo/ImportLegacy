const fs = require('fs');
const { Transform } = require('stream');
const { parse } = require('csv-parse');

/**
 * Parses a CSV file using Node.js streams.
 * @param {string} filePath - Absolute or relative path to the CSV file.
 * @returns {Transform} A readable stream of { row: number, data: object } objects.
 */
function parseCSV(filePath) {
  let rowNumber = 0;

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const numberer = new Transform({
    objectMode: true,
    transform(record, _encoding, callback) {
      rowNumber += 1;
      callback(null, { row: rowNumber, data: record });
    },
  });

  const fileStream = fs.createReadStream(filePath);

  // Propagate file-read errors into the numberer so callers see one error surface
  fileStream.on('error', (err) => numberer.destroy(err));
  parser.on('error', (err) => numberer.destroy(err));

  fileStream.pipe(parser).pipe(numberer);

  return numberer;
}

module.exports = { parseCSV };
