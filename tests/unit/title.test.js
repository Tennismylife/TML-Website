import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

test('page head title contains expected string', () => {
  const headPath = path.join(root, 'app', 'tennis-match-database', 'head.tsx');
  const content = fs.readFileSync(headPath, 'utf8');
  expect(content).toContain('TennisMyLife – Complete Match Database & Stats');
});

test('layout siteTitle does not contain legacy title', () => {
  const layoutPath = path.join(root, 'app', 'layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  expect(content).not.toContain('TML — Tennis Records Data History Rankings, Matches & GOAT');
});
