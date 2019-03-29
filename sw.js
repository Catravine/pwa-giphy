// SW Version
const version = '1.2';

// Static Cache - App Shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];

// SW Install
self.addEventListener('install', e => {

    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
    );
});

// SW Activate
self.addEventListener('activate', e => {

    // Clean static caches
    let cleaned = caches.keys().then( keys => {
        keys.forEach( key => {
            if ( key !== `static-${version}` && key.match('static-') ) {
                return caches.delete(key);
            }
        });
    });

    e.waitUntil(cleaned);
});

// Static cache strategy - Cache with network fallback.
const staticCache = (req, cacheName=`static-${version}`) => {
    return caches.match(req).then(cachedRes => {

        // Return cached response if found
        if (cachedRes) return cachedRes;

        // Fall back to network
        return fetch(req).then( networkRes => {

            // Update cache with new response
            caches.open(cacheName)
                .then(cache => cache.put(req, networkRes));

            // return clone of network response up the promise chain.
            return networkRes.clone()
        });
    });
}

// Network with Cache fallback
const fallbackCache = (req) => {
    return fetch(req).then(networkRes => {
        // Check if res is OK, else go to cached
        if(!networkRes.ok) throw 'Fetch Error';

        // update cached
        caches.open(`static-${version}`)
            .then(cache => cache.put(req, networkRes));

        // Return clone of network response
        return networkRes.clone();
    })

    // Try cached
    .catch(err => caches.match(req));
}

// Clean old Giphys from the 'giphy' cached
const cleanGiphyCache = (giphys) => {

    caches.open('giphy').then( cache => {

        // GEt all cache entries
        cache.keys().then( keys => {

            // Loop entries
            keys.forEach( key => {

                // if entry is NOTE part of current giphys, delete
                if(!giphys.includes(key.url)) cache.delete(key);
            });
        });
    });
}

// SW Fetch
self.addEventListener('fetch', e => {
    // App Shell
    if(e.request.url.match(location.origin)) {
        e.respondWith(staticCache(e.request));

        // Giphy api
    } else if (e.request.url.match('https://api.giphy.com/v1/gifs/trending')) {
        e.respondWith(fallbackCache(e.request));
    }

    // Giphy Media
    else if (e.request.url.match('giphy.com/media')) {
        e.respondWith(staticCache(e.request, 'giphy'));
    }
});

// Listen for message from client
self.addEventListener('message', e => {
    // Identify message
    if(e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})
