import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DineManager',
    short_name: 'DineManager',
    description: 'ระบบจัดการร้านอาหาร ครบวงจร | DineManager',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Shop Dashboard',
        short_name: 'Shop',
        description: 'Open shop dashboard',
        url: '/dashboard/shop',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Customer Menu',
        short_name: 'Menu',
        description: 'Open customer menu',
        url: '/dashboard/customer/menus',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
