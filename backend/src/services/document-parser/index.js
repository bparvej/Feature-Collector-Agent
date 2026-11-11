import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParseLib from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';
import * as cheerio from 'cheerio';

const parsePdf = pdfParseLib;

const readFileBuffer = async (filePath) => fs.readFile(filePath);

export async function parseDocumentFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const buffer = await readFileBuffer(filePath);

  switch (ext) {
    case '.txt':
      return { text: buffer.toString('utf8'), metadata: { extension: ext } };
    case '.md':
    case '.markdown':
      return { text: buffer.toString('utf8'), metadata: { extension: ext } };
    case '.csv':
      return parseCsvText(buffer.toString('utf8'));
    case '.html':
      return parseHtml(buffer.toString('utf8'));
    case '.json':
      return { text: buffer.toString('utf8'), metadata: { extension: ext } };
    case '.pdf': {
      const parsed = await pdfParse(buffer);
      return { text: parsed.text, metadata: { extension: ext } };
    }
    case '.docx': {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, metadata: { extension: ext } };
    }
    case '.xlsx':
    case '.xls': {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      const cells = sheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return `${sheetName}: ${XLSX.utils.sheet_to_csv(sheet)}`;
      });
      return { text: cells.join('\n\n'), metadata: { extension: ext, sheets: sheetNames } };
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function pdfParse(buffer) {
  const parsed = await parsePdf(buffer);
  return parsed;
}

function parseCsvText(rawText) {
  const records = parseCsv(rawText, { bom: true, skip_empty_lines: true });
  return { text: records.map((row) => row.join(' | ')).join('\n'), metadata: { extension: '.csv', rows: records.length } };
}

function parseHtml(rawText) {
  const $ = cheerio.load(rawText);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { text, metadata: { extension: '.html' } };
}
