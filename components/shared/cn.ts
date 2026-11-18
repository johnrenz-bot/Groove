/**
 * Back-compat import site. The canonical `cn` lives in `@/lib/utils` next to
 * the other shared helpers (formatCurrency, formatDate, …). This module is
 * re-exported so the 160+ existing `@/components/shared/cn` imports keep
 * working unchanged.
 */
import { cn } from '@/lib/utils';

export { cn };
export default cn;
