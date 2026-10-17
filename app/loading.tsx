import FoodLoader from '@/components/food-loader'

export default function Loading() {
  return <main className="flex min-h-dvh items-center justify-center bg-background"><FoodLoader label="Preparando tus antojos…" size={160} /></main>
}
