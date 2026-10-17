/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/orders',
        destination: '/dashboard/orders',
        permanent: false,
      },
      {
        source: '/orders/pending',
        destination: '/dashboard/orders/pending',
        permanent: false,
      },
      {
        source: '/orders/processing',
        destination: '/dashboard/orders/processing',
        permanent: false,
      },
      {
        source: '/orders/in-transit',
        destination: '/dashboard/orders/in-transit',
        permanent: false,
      },
      {
        source: '/orders/completed',
        destination: '/dashboard/orders/completed',
        permanent: false,
      },
      {
        source: '/orders/drafts',
        destination: '/dashboard/orders/drafts',
        permanent: false,
      },
      {
        source: '/orders/abandoned',
        destination: '/dashboard/orders/abandoned',
        permanent: false,
      },
      {
        source: '/orders/reviews',
        destination: '/dashboard/orders/reviews',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
