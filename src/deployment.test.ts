import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

type ViteConfig = {
  base?: string;
  server?: { host?: string };
};

const resolveConfig = (command: 'serve' | 'build'): ViteConfig => {
  if (typeof viteConfig !== 'function') return viteConfig;
  return viteConfig({
    command,
    mode: command === 'build' ? 'production' : 'development',
    isSsrBuild: false,
    isPreview: false,
  }) as ViteConfig;
};

describe('mobile web deployment', () => {
  it('builds asset URLs for the GitHub Pages project path', () => {
    expect(resolveConfig('build').base).toBe('/beiyuemiao/');
    expect(resolveConfig('serve').base).toBe('/');
  });

  it('lets phones on the local network reach the development server', () => {
    expect(resolveConfig('serve').server?.host).toBe('0.0.0.0');
  });

  it('publishes the Vite dist directory instead of source files', () => {
    const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
    const appUi = readFileSync('src/ui/app-ui.ts', 'utf8');

    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('path: ./dist');
    expect(workflow).toContain('actions/upload-pages-artifact');
    expect(workflow).toContain('actions/deploy-pages');
    expect(appUi).toContain('import.meta.env.BASE_URL');
  });
});
