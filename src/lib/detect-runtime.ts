import type { RuntimeType } from '@/types/runner';
import type { IDEFile } from '@/types/ide';

/**
 * Scan project files and return the best-matching runtime.
 * Detection priority: config files first, then file extensions.
 */
export function detectRuntime(files: IDEFile[]): RuntimeType {
  const names = new Set<string>();
  const exts = new Set<string>();

  for (const f of files) {
    if (f.isFolder) continue;
    const name = f.name.toLowerCase();
    names.add(name);
    const dot = name.lastIndexOf('.');
    if (dot !== -1) exts.add(name.slice(dot));
  }

  const hasExt = (...e: string[]) => e.some(x => exts.has(x));
  const hasName = (...n: string[]) => n.some(x => names.has(x));

  // Config files take highest priority
  if (hasName('cargo.toml') || hasExt('.rs')) return 'rust';
  if (hasName('go.mod') || hasExt('.go')) return 'go';
  if (hasName('pubspec.yaml') || hasExt('.dart')) return 'dart';
  if (hasName('package.swift') || hasExt('.swift')) return 'swift';
  if (hasExt('.kt', '.kts')) return 'kotlin';
  if (hasName('composer.json') || hasExt('.php')) return 'php';
  if (hasName('gemfile') || hasExt('.rb')) return 'ruby';
  if (hasExt('.sol')) return 'solidity';
  if (hasExt('.cpp', '.cc', '.cxx')) return 'cpp';
  if (hasExt('.c')) return 'c';
  if (hasExt('.java')) return 'java';
  if (hasExt('.r', '.rmd')) return 'r';
  if (hasName('requirements.txt', 'setup.py', 'pyproject.toml') || hasExt('.py')) return 'python';
  if (hasExt('.sh', '.bash') && !hasName('package.json') && !hasExt('.ts', '.js')) return 'shell';

  return 'node';
}
