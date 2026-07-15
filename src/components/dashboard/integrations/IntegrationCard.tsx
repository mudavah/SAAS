"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./HealthIndicator";
import {
  CATEGORY_META,
  STATUS_COLORS,
  type Integration,
} from "./types";

interface IntegrationCardProps {
  integration: Integration;
  action?: React.ReactNode;
}

export function IntegrationCard({ integration, action }: IntegrationCardProps) {
  const meta = CATEGORY_META[integration.category];
  const Icon = meta?.icon;
  const href = `/dashboard/integrations/${integration.id}`;

  return (
    <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
      <Link href={href} className="block h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              {Icon && <Icon className="h-4 w-4 text-kazi-green shrink-0" />}
              <span className="truncate">{integration.name}</span>
            </span>
            <HealthBadge status={integration.healthStatus} />
          </CardTitle>
        </CardHeader>
      </Link>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={STATUS_COLORS[integration.status]}>
            {integration.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {integration.environment}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {integration.category}
          </Badge>
        </div>
        {integration.errorMessage && (
          <p className="text-xs text-destructive line-clamp-2">
            {integration.errorMessage}
          </p>
        )}
        <div className="pt-1">
          {action ?? (
            <Link href={href}>
              <Button variant="outline" size="sm" className="w-full">
                Manage
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
