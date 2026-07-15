"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  type IntegrationCategorySummary,
} from "./types";

interface CategoryGridProps {
  categories: IntegrationCategorySummary[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3",
        className
      )}
    >
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat.category];
        const Icon = meta?.icon;
        return (
          <Link
            key={cat.category}
            href={`/dashboard/integrations/marketplace?category=${cat.category}`}
            className="block"
          >
            <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kazi-green/10 text-kazi-green">
                  {Icon && <Icon className="h-5 w-5" />}
                </div>
                <div className="text-sm font-medium leading-tight">
                  {meta?.label ?? cat.category}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cat.connected}/{cat.count} connected
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
