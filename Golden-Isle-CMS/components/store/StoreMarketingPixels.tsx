'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/context/StoreContext';

export default function StoreMarketingPixels() {
    const { settings } = useStore();
    const pathname = usePathname();
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (settings.fb_pixel_id) {
            if (!document.getElementById('fb-pixel-script')) {
                (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
                    if (f.fbq) return;
                    n = f.fbq = function () {
                        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                    };
                    if (!f._fbq) f._fbq = n;
                    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
                    t = b.createElement(e); t.async = !0; t.id = 'fb-pixel-script';
                    t.src = v; s = b.getElementsByTagName(e)[0];
                    if (s && s.parentNode) s.parentNode.insertBefore(t, s);
                })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
                (window as any).fbq('init', settings.fb_pixel_id);
                (window as any).fbq('track', 'PageView');
            }
        }
        if (settings.google_analytics_id) {
            const gaScriptId = 'ga-gtag-script';
            if (!document.getElementById(gaScriptId)) {
                const script = document.createElement('script');
                script.id = gaScriptId;
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
                document.head.appendChild(script);
                (window as any).dataLayer = (window as any).dataLayer || [];
                function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
                (window as any).gtag = gtag;
                gtag('js', new Date());
                gtag('config', settings.google_analytics_id);
            }
        }
        if (settings.tiktok_pixel_id) {
            if (!document.getElementById('tt-pixel-script')) {
                (function (w: any, d: any, t: any) {
                    w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"], ttq.setAndDefer = function (t: any, e: any) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++)ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t: any) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)ttq.setAndDefer(e, ttq.methods[n]); return e }, ttq.load = function (e: any, n?: any) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {}; var o = document.createElement("script"); o.id = 'tt-pixel-script'; o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t; var a = document.getElementsByTagName("script")[0]; if (a && a.parentNode) a.parentNode.insertBefore(o, a) };
                    ttq.load(settings.tiktok_pixel_id);
                    ttq.page();
                })(window, document, 'ttq');
            }
        }
    }, [settings.fb_pixel_id, settings.google_analytics_id, settings.tiktok_pixel_id]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (settings.fb_pixel_id && typeof (window as any).fbq === 'function') {
            (window as any).fbq('track', 'PageView');
        }
        if (settings.google_analytics_id && typeof (window as any).gtag === 'function') {
            (window as any).gtag('config', settings.google_analytics_id, { page_path: pathname });
        }
        if (settings.tiktok_pixel_id && typeof (window as any).ttq?.page === 'function') {
            (window as any).ttq.page();
        }
    }, [pathname, settings.fb_pixel_id, settings.google_analytics_id, settings.tiktok_pixel_id]);

    return null;
}
