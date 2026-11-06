export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapServer } = await import('@/lib/server-boot');
    await bootstrapServer();
  }
}

