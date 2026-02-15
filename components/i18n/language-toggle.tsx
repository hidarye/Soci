'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/i18n/language-provider';

type LanguageToggleProps = {
  className?: string;
  compact?: boolean;
  minimal?: boolean;
};

export function LanguageToggle({ className, compact = true, minimal = false }: LanguageToggleProps) {
  const { locale, toggleLocale, t } = useLanguage();
  const nextLocale = locale === 'en' ? 'ar' : 'en';
  const title =
    nextLocale === 'ar'
      ? t('language.switchToArabic', 'Switch to Arabic')
      : t('language.switchToEnglish', 'Switch to English');

  return (
    <Button
      type="button"
      variant={minimal ? 'ghost' : 'outline'}
      size={compact ? 'icon' : 'sm'}
      className={cn(
        compact ? 'h-9 w-9 rounded-xl' : 'h-9 rounded-xl px-3',
        minimal ? 'border-transparent bg-transparent shadow-none hover:bg-transparent hover:text-foreground' : '',
        className
      )}
      aria-label={title}
      title={title}
      onClick={toggleLocale}
    >
      <Languages size={compact ? 16 : 14} />
      {!compact ? (
        <span>{nextLocale === 'ar' ? t('language.arShort', 'AR') : t('language.enShort', 'EN')}</span>
      ) : null}
    </Button>
  );
}
