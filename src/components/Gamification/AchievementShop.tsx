import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Check, ChevronDown, ChevronUp, Palette, User, Zap, Shield, RotateCcw, Image, Volume2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  category: 'themes' | 'avatars' | 'boosters' | 'customization'
  icon: string
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'theme_ocean', name: 'Tema Océano', description: 'Fondos y colores oceánicos para la app', price: 50, category: 'themes', icon: '🌊' },
  { id: 'theme_forest', name: 'Tema Bosque', description: 'Tonos verdes y naturales', price: 50, category: 'themes', icon: '🌲' },
  { id: 'theme_sunset', name: 'Tema Atardecer', description: 'Colores cálidos de atardecer', price: 50, category: 'themes', icon: '🌅' },
  { id: 'avatar_wolf', name: 'Avatar Lobo', description: 'Un avatar feroz de lobo', price: 30, category: 'avatars', icon: '🐺' },
  { id: 'avatar_cat', name: 'Avatar Gato', description: 'Un avatar elegante de gato', price: 30, category: 'avatars', icon: '🐱' },
  { id: 'avatar_owl', name: 'Avatar Búho', description: 'Un avatar sabio de búho', price: 30, category: 'avatars', icon: '🦉' },
  { id: 'booster_doublexp', name: 'Doble XP 24h', description: 'Ganá el doble de XP por 24 horas', price: 100, category: 'boosters', icon: '⚡' },
  { id: 'booster_streakshield', name: 'Streak Shield', description: 'Protege tu racha por 1 día', price: 200, category: 'boosters', icon: '🛡️' },
  { id: 'booster_extrareview', name: 'Extra Review', description: 'Repasá 10 flashcards extra hoy', price: 50, category: 'boosters', icon: '🔄' },
  { id: 'custom_bg', name: 'Fondo personalizado', description: 'Subí tu propia imagen de fondo', price: 75, category: 'customization', icon: '🖼️' },
  { id: 'custom_sounds', name: 'Sonidos premium', description: 'Nuevos sonidos para notificaciones', price: 100, category: 'customization', icon: '🎵' },
]

const CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'themes', label: 'Temas' },
  { id: 'avatars', label: 'Avatares' },
  { id: 'boosters', label: 'Boosters' },
  { id: 'customization', label: 'Personalización' },
]

export default function AchievementShop() {
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('shop_coins')
    return saved ? parseInt(saved, 10) : 350
  })
  const [ownedItems, setOwnedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('shop_owned')
    return saved ? JSON.parse(saved) : []
  })
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState<ShopItem | null>(null)
  const [showOwned, setShowOwned] = useState(false)

  useEffect(() => {
    localStorage.setItem('shop_coins', coins.toString())
  }, [coins])

  useEffect(() => {
    localStorage.setItem('shop_owned', JSON.stringify(ownedItems))
  }, [ownedItems])

  const filteredItems = selectedCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(i => i.category === selectedCategory)

  const ownedShopItems = SHOP_ITEMS.filter(i => ownedItems.includes(i.id))

  const handleBuy = (item: ShopItem) => {
    if (ownedItems.includes(item.id) || coins < item.price) return
    setPendingItem(item)
    setConfirmOpen(true)
  }

  const confirmPurchase = () => {
    if (!pendingItem) return
    setCoins(prev => prev - pendingItem.price)
    setOwnedItems(prev => [...prev, pendingItem.id])
    setPendingItem(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-indigo-500" />
          Tienda
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Canjeá monedas por mejoras y personalización</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪙</span>
              <div>
                <p className="text-xs text-muted-foreground">Monedas disponibles</p>
                <p className="text-2xl font-bold text-yellow-600">{coins}</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-muted-foreground space-y-0.5">
              <p>+5 por tarea completada</p>
              <p>+2 por flashcard repasada</p>
              <p>+10 por día de racha</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-500/20 text-indigo-600 border border-indigo-500/30'
                  : 'bg-accent/50 text-muted-foreground hover:bg-accent border border-transparent'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {filteredItems.map((item, i) => {
          const owned = ownedItems.includes(item.id)
          const canAfford = coins >= item.price
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.03 }}
            >
              <Card className={`h-full ${owned ? 'opacity-60' : ''}`}>
                <CardContent className="py-4">
                  <div className="text-center text-3xl mb-2">{item.icon}</div>
                  <p className="text-sm font-semibold text-center mb-1">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground text-center mb-3">{item.description}</p>
                  {owned ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-green-600">
                      <Check className="h-3.5 w-3.5" /> Comprado
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      size="sm"
                      className={`w-full gap-1.5 ${canAfford ? '' : 'opacity-60'}`}
                      variant={canAfford ? 'default' : 'outline'}
                    >
                      <span>🪙 {item.price}</span>
                      {!canAfford && <span className="text-red-500 text-[10px] ml-1">({coins} disponibles)</span>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {ownedShopItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <button onClick={() => setShowOwned(prev => !prev)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Ya comprados ({ownedShopItems.length})</span>
              </div>
              {showOwned ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showOwned && (
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ownedShopItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-border">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-medium truncate">{item.name}</span>
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar compra"
        description={pendingItem ? `¿Comprar "${pendingItem.name}" por 🪙 ${pendingItem.price}?` : ''}
        confirmLabel="Comprar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={confirmPurchase}
      />
    </div>
  )
}
