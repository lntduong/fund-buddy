import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fund Buddy - Quản Lý Quỹ Nhóm',
    short_name: 'Fund Buddy',
    description: 'Ghi nhật ký ăn chơi, chia hóa đơn tự động và nhắc nợ Zalo cực nhanh cùng bạn bè.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#10b981',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
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
        purpose: 'maskable',
      },
    ],
  };
}
