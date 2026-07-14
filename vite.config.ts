import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      base: '/',
      server: {
        port: 8003,
        strictPort: true,
        host: '0.0.0.0',
        warmup: {
          clientFiles: [
            './index.html',
            './src/index.tsx',
            './src/index.css',
            './src/App.tsx',
            './src/AppCore.tsx',
            './src/AppShell.tsx'
          ]
        },
        proxy: {
          '/proxy/ollama': {
            target: 'http://localhost:11434',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      preview: {
        port: 8003,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['assets/image/favicon.ico'],
          manifest: {
            name: '叙说·春信',
            short_name: '叙说',
            description: 'AI 聊天应用',
            theme_color: '#ffffff',
            background_color: '#EDEDED',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'assets/image/logo.jpg',
                sizes: '192x192',
                type: 'image/jpeg',
                purpose: 'any maskable'
              },
              {
                src: 'assets/image/logo.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-font-stylesheets',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-font-webfonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cdnjs-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'esm-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: false
          }
        })
      ],
      build: {
        target: ['es2018', 'chrome61'],
        cssTarget: 'chrome61',
        chunkSizeWarningLimit: 900,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'react';
              }
              if (id.includes('node_modules/@capacitor/')) {
                return 'capacitor';
              }
              if (id.includes('node_modules/@google/genai/')) {
                return 'genai';
              }
              if (id.includes('node_modules/jszip/')) {
                return 'jszip';
              }
              if (id.includes('/render-')) {
                return 'render';
              }
            }
          }
        }
      },
      define: {
        // 与xushuo旧版一致，通过环境变量配置API代理URL
        'import.meta.env.VITE_API_PROXY_URL': JSON.stringify(env.VITE_API_PROXY_URL || ''),
        // 构建时间戳（用于 APK 更新检测）
        'import.meta.env.VITE_BUILD_TIME': JSON.stringify(String(Date.now()))
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
