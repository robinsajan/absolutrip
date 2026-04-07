 "use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type BackCloseControllerArgs = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Makes "open" state available even for uncontrolled Radix roots (defaultOpen),
 * so Back-to-close can work project-wide without requiring every caller to be controlled.
 */
export function useBackCloseController<T extends BackCloseControllerArgs>(props: T) {
  const id = useId();
  const isControlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(props.defaultOpen ?? false);

  const open = isControlled ? props.open : uncontrolledOpen;

  const pushedRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const openRef = useRef<boolean>(!!open);
  openRef.current = !!open;

  const pushModalState = useCallback(() => {
    if (pushedRef.current) return;
    window.history.pushState({ __tsModal: true, __tsModalId: id }, "");
    pushedRef.current = true;
  }, [id]);

  const onOpenChange = useCallback(
    (next) => {
      // When opening, push a history entry immediately so Back closes it.
      if (next) pushModalState();

      if (!isControlled) setUncontrolledOpen(next);
      props.onOpenChange?.(next);
    },
    [isControlled, props.onOpenChange, pushModalState]
  );

  useEffect(() => {
    const onPopState = () => {
      if (!openRef.current || !pushedRef.current) return;

      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      // Back pressed: close the modal/sheet.
      onOpenChange(false);
      pushedRef.current = false;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      // Covers controlled opens where parent sets open=true without calling our handler.
      pushModalState();
      return;
    }

    if (!pushedRef.current) return;

    // Closed via UI: remove the extra history entry we created on open.
    ignoreNextPopRef.current = true;
    window.history.back();
    pushedRef.current = false;
  }, [open, pushModalState]);

  // Stable object identity for consumers.
  return useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
}

