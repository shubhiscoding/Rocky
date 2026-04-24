import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 text-sm font-black text-white shadow-sm',
        className,
      )}
    >
      ✦
    </div>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      <span className="text-teal-400">Rocky</span>
    </span>
  );
}
