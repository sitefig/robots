// Which sentence the offer leads with after a check. The wording is sold on
// what the report found, so getting the branch wrong means telling someone
// their file is in good order while errors are listed above it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadKey } from '../src/client/components/sales.ts';
import { loadLocales } from '../src/lib/site.ts';

/** The smallest report shape leadKey reads. */
const report = ({ errors = 0, warnings = 0, training = null }) => ({
  summary: { issues: { errors, warnings, notes: 0 } },
  aiStatus: { groups: training ? [{ counts: training }] : [] },
});

const open = { open: 12, partial: 0, blocked: 0 };
const mixed = { open: 8, partial: 2, blocked: 2 };

test('errors come first: something is broken now', () => {
  assert.equal(leadKey(report({ errors: 1, warnings: 5, training: open })), 'sales.after.errors');
});

test('then the AI crawlers, when every one of them is let in', () => {
  assert.equal(leadKey(report({ training: open })), 'sales.after.training');
  assert.equal(leadKey(report({ warnings: 3, training: open })), 'sales.after.training');
});

test('a file that blocks some AI crawlers is judged on its warnings', () => {
  assert.equal(leadKey(report({ warnings: 3, training: mixed })), 'sales.after.warnings');
});

test('nothing wrong and a decision made about AI crawlers leaves only the future to sell', () => {
  assert.equal(leadKey(report({ training: mixed })), 'sales.after.clean');
  assert.equal(leadKey(report({})), 'sales.after.clean');
});

test('every sentence it can choose exists in English', () => {
  const en = loadLocales().en;
  for (const key of ['sales.after.errors', 'sales.after.training', 'sales.after.warnings', 'sales.after.clean']) {
    assert.ok(en[key], `${key} is missing from the dictionary`);
  }
});
