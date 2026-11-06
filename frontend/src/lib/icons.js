import {
  BookOpen,
  Briefcase,
  Car,
  Coins,
  Film,
  Gift,
  Heart,
  Home,
  Laptop,
  MoreHorizontal,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';

export const CATEGORY_ICON_MAP = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  car: Car,
  home: Home,
  zap: Zap,
  heart: Heart,
  film: Film,
  'shopping-bag': ShoppingBag,
  'book-open': BookOpen,
  plane: Plane,
  repeat: Repeat,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
  coins: Coins,
};

export const FALLBACK_CATEGORY_ICON = Tag;

function normalizeSlug(slug) {
  if (typeof slug !== 'string') {
    return '';
  }
  return slug
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

export function getCategoryIcon(slug) {
  const key = normalizeSlug(slug);
  if (key && Object.prototype.hasOwnProperty.call(CATEGORY_ICON_MAP, key)) {
    return CATEGORY_ICON_MAP[key];
  }
  return FALLBACK_CATEGORY_ICON;
}
