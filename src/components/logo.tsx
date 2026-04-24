import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white',
        className,
      )}
    >
      R
    </div>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('text-lg font-semibold text-teal-500', className)}>
      Rocky
    </span>
  );
}
