import type { Category } from "@fjm/shared";
import {
  ArrowLeftRight, BookOpen, Briefcase, Bus, Clapperboard, Coins, CreditCard, HeartPulse, House,
  Package, Receipt, Shield, ShoppingBag, TrendingUp, Users, Utensils, type LucideIcon,
} from "lucide-react";
import { CATEGORY_LABEL } from "./format";
import { cn } from "./utils";

/** One lucide icon per category (the UI uses no emoji). */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  salary: Briefcase,
  other_income: Coins,
  food: Utensils,
  transport: Bus,
  shopping: ShoppingBag,
  bills: Receipt,
  rent: House,
  health: HeartPulse,
  entertainment: Clapperboard,
  education: BookOpen,
  family: Users,
  savings_invest: TrendingUp,
  insurance: Shield,
  debt: CreditCard,
  own_transfer: ArrowLeftRight,
  other: Package,
};

/** Icon + Thai label, e.g. [Utensils] อาหาร. `label` overrides the text (e.g. a lumped "อื่น ๆ" row). */
export function CategoryLabel({ category, label, className }: { category: Category; label?: string; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? Package;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Icon aria-hidden size={14} className="shrink-0" />{label ?? CATEGORY_LABEL[category] ?? category}
    </span>
  );
}
