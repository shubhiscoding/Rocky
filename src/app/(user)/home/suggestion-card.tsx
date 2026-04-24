import { motion } from 'framer-motion';

import type { Suggestion } from './data/suggestions';

interface SuggestionCardProps extends Suggestion {
  delay?: number;
  useSubtitle?: boolean;
  onSelect: (text: string) => void;
}

export function SuggestionCard({
  title,
  subtitle,
  delay = 0,
  useSubtitle = false,
  onSelect,
}: SuggestionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(useSubtitle ? subtitle : title)}
      title={subtitle}
      className="rounded-full border border-border/50 bg-muted/30 px-4 py-2 text-sm text-foreground/70 transition-all duration-200 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-400"
    >
      {title}
    </motion.button>
  );
}
