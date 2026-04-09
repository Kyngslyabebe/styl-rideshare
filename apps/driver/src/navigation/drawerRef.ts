// Shared ref so screens can reopen the drawer on back press
let _openDrawer: (() => void) | null = null;

export function setDrawerOpen(fn: () => void) {
  _openDrawer = fn;
}

export function reopenDrawer() {
  _openDrawer?.();
}
