const CACHE_NAME = 'membership-app-v1';
const RUNTIME_CACHE = 'membership-runtime-v1';

// ملفات ساكنة يجب تخزينها مباشرة
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// تثبيت Service Worker وتخزين الملفات الثابتة
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      // محاولة تخزين الملفات الثابتة، لكن لا نفشل إذا لم تكن متاحة
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
          }).catch(() => {
            // تجاهل الأخطاء في التخزين المسبق
            console.log(`Could not cache: ${url}`);
          })
        )
      );
    }).catch(() => {
      console.log('Cache storage failed');
    })
  );
  
  // تنشيط الـ Service Worker فوراً
  self.skipWaiting();
});

// تنشيط Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // حذف الـ caches القديمة
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // السيطرة على جميع الصفحات المفتوحة
  self.clients.claim();
});

// استراتيجية الـ Fetch: Network First مع Fallback إلى Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // تخزين الاستجابات الناجحة
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // استخدام الـ cache كـ fallback عند عدم توفر الاتصال
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          // استجابة افتراضية للصفحات
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          // استجابة افتراضية للموارد الأخرى
          return new Response('Offline - Data not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// معالجة الرسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE);
  }
});

// مزامنة خلفية (للمستقبل)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-members') {
    event.waitUntil(
      // هنا يمكن إضافة منطق المزامنة مع السيرفر
      Promise.resolve()
    );
  }
});

console.log('Service Worker: Loaded successfully');
