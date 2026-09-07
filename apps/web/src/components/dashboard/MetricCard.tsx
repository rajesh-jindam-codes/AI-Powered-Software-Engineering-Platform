import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaType = 'positive',
  description,
  icon: Icon,
  iconColor = 'text-blue-500',
}: MetricCardProps) {
  return (
    <Card className="hover:border-primary/40 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className={cn('p-2 rounded-lg bg-muted/60', iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {delta && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                deltaType === 'positive' && 'bg-emerald-500/10 text-emerald-500',
                deltaType === 'negative' && 'bg-rose-500/10 text-rose-500',
                deltaType === 'neutral' && 'bg-muted text-muted-foreground',
              )}
            >
              {delta}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
