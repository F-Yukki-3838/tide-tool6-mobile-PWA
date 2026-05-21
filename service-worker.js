// キャッシュの名前（バージョン管理用）
const CACHE_NAME = 'pwa-cache-v1';

// オフラインで利用可能にしたいファイルのリスト
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ① インストールイベント：ファイルをキャッシュに登録する
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ② アクティベートイベント：古いキャッシュを削除する
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// ③ フェッチイベント：ネットワークを見に行きつつ、通ったファイルを自動キャッシュする
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. すでにキャッシュがあれば、それを即座に返す（高速化）
      if (cachedResponse) {
        // バックグラウンドで最新のデータを取得してキャッシュを更新しておく（次回のアクセスのため）
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        });
        return cachedResponse;
      }

      // 2. キャッシュがなければ、ネットワークから取得する
      return fetch(event.request).then((networkResponse) => {
        // 正常なレスポンス、かつ身内のファイル（HTTP/HTTPS）であれば、自動でキャッシュに保存
        if (networkResponse.status === 200 && networkResponse.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 完全にオフラインで、キャッシュにもない場合のフォールバック（任意）
        // 例: return caches.match('/offline.html');
      });
    })
  );
});