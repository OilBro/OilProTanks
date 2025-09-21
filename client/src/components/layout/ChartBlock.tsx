import { ReactNode } from 'react';
import clsx from 'clsx';

interface ChartBlockProps {
  children: ReactNode;
  className?: string;
  /** Optional fixed height (number = px) applied to an inner wrapper so ResponsiveContainer charts have a bounding box */
  height?: number | string;
  /** Adds an id for anchor linking */
  id?: string;
}

/**
 * ChartBlock enforces vertical spacing and (optionally) a fixed height so
 * multiple Recharts instances don't visually overlap when parent containers
 * collapse or flex. Use height when the child chart relies on a percentage height.
 */
export function ChartBlock({ children, className, height, id }: ChartBlockProps) {
  return (
    <section id={id} className={clsx('chart-block mb-10 last:mb-0', className)}>
      {height ? (
        <div style={{ height: typeof height === 'number' ? `${height}px` : height }} className="relative">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default ChartBlock;
