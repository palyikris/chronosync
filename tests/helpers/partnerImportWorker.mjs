import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as XLSX from 'xlsx';
import * as partnerImport from '../../src/utils/partnerBillingImport.ts';

const { outputText } = ts.transpileModule(readFileSync(new URL('../../src/workers/partnerImport.worker.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

// Run the actual worker handler, including SheetJS and decoding, without a browser.
export function parsePartnerFile(buffer, csv = true, encoding = 'auto') {
  let response;
  const self = { postMessage: message => { response = structuredClone(message); } };
  vm.runInNewContext(outputText, { self, TextDecoder, exports: {}, require: name => {
    if (name === 'xlsx') return XLSX;
    if (name === '../utils/partnerBillingImport') return partnerImport;
    throw new Error(`Unexpected worker dependency: ${name}`);
  } });
  self.onmessage({ data: { buffer: Uint8Array.from(buffer).buffer, csv, encoding } });
  return response;
}
