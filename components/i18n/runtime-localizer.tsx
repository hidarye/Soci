'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/i18n/language-provider';
import { translateRuntimeText } from '@/lib/i18n/runtime-translations';

const TRACKED_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'aria-placeholder', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

type AttrName = (typeof TRACKED_ATTRIBUTES)[number];

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest('[data-no-i18n]')) return true;
  return false;
}

function localizeTextNode(
  node: Text,
  locale: 'en' | 'ar',
  originals: WeakMap<Text, string>
) {
  if (shouldSkipTextNode(node)) return;
  const current = node.nodeValue || '';
  if (!current.trim()) return;

  if (!originals.has(node)) {
    originals.set(node, current);
  }
  const source = originals.get(node) || current;
  const translated = translateRuntimeText(source, locale);
  if (translated !== current) {
    node.nodeValue = translated;
  }
}

function localizeElementAttributes(
  element: Element,
  locale: 'en' | 'ar',
  originals: WeakMap<Element, Map<AttrName, string>>
) {
  if (element.closest('[data-no-i18n]')) return;
  let elementOriginals = originals.get(element);
  if (!elementOriginals) {
    elementOriginals = new Map<AttrName, string>();
    originals.set(element, elementOriginals);
  }

  for (const attr of TRACKED_ATTRIBUTES) {
    if (!element.hasAttribute(attr)) continue;
    const current = element.getAttribute(attr);
    if (!current || !current.trim()) continue;
    if (!elementOriginals.has(attr)) {
      elementOriginals.set(attr, current);
    }
    const source = elementOriginals.get(attr) || current;
    const translated = translateRuntimeText(source, locale);
    if (translated !== current) {
      element.setAttribute(attr, translated);
    }
  }
}

function walkAndLocalize(
  root: ParentNode,
  locale: 'en' | 'ar',
  textOriginals: WeakMap<Text, string>,
  attrOriginals: WeakMap<Element, Map<AttrName, string>>
) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentText = textWalker.nextNode();
  while (currentText) {
    localizeTextNode(currentText as Text, locale, textOriginals);
    currentText = textWalker.nextNode();
  }

  const selector = TRACKED_ATTRIBUTES.map((attr) => `[${attr}]`).join(',');
  root.querySelectorAll?.(selector).forEach((element) => {
    localizeElementAttributes(element, locale, attrOriginals);
  });
}

export function RuntimeLocalizer() {
  const { locale } = useLanguage();
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/register/') ||
    pathname.startsWith('/verify-email/') ||
    pathname.startsWith('/forgot-password/') ||
    pathname.startsWith('/reset-password/');
  const shouldLocalizeRuntime = locale === 'ar' && !isAuthRoute;
  const textOriginalsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const attrOriginalsRef = useRef<WeakMap<Element, Map<AttrName, string>>>(new WeakMap());
  const isApplyingRef = useRef(false);

  useEffect(() => {
    if (!shouldLocalizeRuntime) return;
    if (typeof document === 'undefined') return;

    const applyLocalization = (root: ParentNode = document.body) => {
      if (isApplyingRef.current) return;
      isApplyingRef.current = true;
      try {
        walkAndLocalize(root, locale, textOriginalsRef.current, attrOriginalsRef.current);
      } finally {
        isApplyingRef.current = false;
      }
    };

    applyLocalization(document.body);

    const observer = new MutationObserver((mutations) => {
      if (isApplyingRef.current) return;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const node = mutation.target as Text;
          if (node.parentElement) {
            localizeTextNode(node, locale, textOriginalsRef.current);
          }
          continue;
        }

        if (mutation.type === 'attributes') {
          const element = mutation.target as Element;
          localizeElementAttributes(element, locale, attrOriginalsRef.current);
          continue;
        }

        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode.nodeType === Node.TEXT_NODE) {
            localizeTextNode(addedNode as Text, locale, textOriginalsRef.current);
            return;
          }
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            walkAndLocalize(
              addedNode as Element,
              locale,
              textOriginalsRef.current,
              attrOriginalsRef.current
            );
          }
        });
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRACKED_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [locale, shouldLocalizeRuntime]);

  return null;
}
