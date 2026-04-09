 "use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type BackCloseControllerArgs = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Optional key for URL query parameter synchronization.
   * If provided, the modal state will be synced with ?[urlKey]=[urlValue]
   */
  urlKey?: string;
  /**
   * Optional value for the URL query parameter. Defaults to "true".
   */
  urlValue?: string;
};

/**
 * Makes "open" state available even for uncontrolled Radix roots (defaultOpen),
 * so Back-to-close can work project-wide without requiring every caller to be controlled.
 * Now also supports URL-synchronized state via query parameters.
 */
export function useBackCloseController<T extends BackCloseControllerArgs>(props: T) {
  const id = useId();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlKey = props.urlKey;
  const urlValue = props.urlValue ?? "true";

  const isControlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(props.defaultOpen ?? false);
  const open = isControlled ? props.open : uncontrolledOpen;

  const lastSearchParamsRef = useRef(searchParams.toString());
  const lastOpenRef = useRef(open);

  // Sync State -> URL and URL -> State
  useEffect(() => {
    if (!urlKey) return;

    const currentParamsStr = searchParams.toString();
    const paramsChanged = currentParamsStr !== lastSearchParamsRef.current;
    const openChanged = open !== lastOpenRef.current;
    const currentVal = searchParams.get(urlKey);
    const shouldBeOpen = currentVal === urlValue;

    if (paramsChanged && !openChanged) {
      // URL changed externally (e.g., Back button)
      if (shouldBeOpen && !open) {
        if (!isControlled) setUncontrolledOpen(true);
        props.onOpenChange?.(true);
      } else if (!shouldBeOpen && open) {
        if (!isControlled) setUncontrolledOpen(false);
        props.onOpenChange?.(false);
      }
    } else if (openChanged) {
      // State changed (prop or internal) -> Update URL if needed
      if (open && !shouldBeOpen) {
        const params = new URLSearchParams(currentParamsStr);
        params.set(urlKey, urlValue);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      } else if (!open && shouldBeOpen) {
        const params = new URLSearchParams(currentParamsStr);
        params.delete(urlKey);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }

    lastSearchParamsRef.current = currentParamsStr;
    lastOpenRef.current = open;
  }, [searchParams, open, urlKey, urlValue, isControlled, router, pathname, props]);


  const pushedRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const openRef = useRef<boolean>(!!open);
  openRef.current = !!open;

  const pushModalState = useCallback(() => {
    if (pushedRef.current) return;
    
    if (urlKey) {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(urlKey) !== urlValue) {
        params.set(urlKey, urlValue);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } else {
      window.history.pushState({ __tsModal: true, __tsModalId: id }, "");
    }
    pushedRef.current = true;
  }, [id, urlKey, urlValue, searchParams, router, pathname]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        pushModalState();
      } else {
        if (urlKey) {
          const params = new URLSearchParams(searchParams.toString());
          if (params.get(urlKey) === urlValue) {
            params.delete(urlKey);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }
        }
      }

      if (!isControlled) setUncontrolledOpen(next);
      props.onOpenChange?.(next);
    },
    [isControlled, props.onOpenChange, pushModalState, urlKey, urlValue, searchParams, router, pathname]
  );

  useEffect(() => {
    const onPopState = () => {
      // If we are using URL keys, Next.js 'useSearchParams' will handle the synchronization.
      // We only need this manual listener for the generic pushState fallback.
      if (urlKey) return;

      if (!openRef.current || !pushedRef.current) return;

      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      onOpenChange(false);
      pushedRef.current = false;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onOpenChange, urlKey]);

  useEffect(() => {
    if (open) {
      pushModalState();
      return;
    }

    if (!pushedRef.current) return;

    if (!urlKey) {
      ignoreNextPopRef.current = true;
      window.history.back();
    }
    pushedRef.current = false;
  }, [open, pushModalState, urlKey]);

  return useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
}

