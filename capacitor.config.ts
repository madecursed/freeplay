import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Нативная оболочка iOS (Capacitor). Тот же веб-код (dist/), но внутри приложения:
 * WKWebView Capacitor разрешает звук без нажатия (mediaTypesRequiringUserActionForPlayback = []),
 * поэтому треки запускаются и переключаются сами, а с фоновым режимом audio — играют на заблокированном экране.
 */
const config: CapacitorConfig = {
  appId: 'io.github.madecursed.nocturne',
  appName: 'Nocturne',
  webDir: 'dist',
  backgroundColor: '#07050c',
  ios: {
    contentInset: 'never',
    backgroundColor: '#07050c',
    // ссылки «Открыть в SoundCloud» — во внешнем браузере, а не внутри приложения
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
