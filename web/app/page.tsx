import HomePageClient from '@/components/HomePageClient'
import { fetchAllActiveProducts } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const initialProducts = await fetchAllActiveProducts()
  return <HomePageClient initialProducts={initialProducts} />
}
