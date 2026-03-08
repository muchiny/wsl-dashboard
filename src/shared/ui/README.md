# 🧩 UI Components

> Shared, reusable UI primitives used across all features and pages.

---

## 📋 Component Reference

| Component | Props | Description | Tests |
|-----------|-------|-------------|-------|
| `ActionIconButton` | `icon: ElementType`, `loading?: boolean`, `iconClassName?: string`, + native `<button>` props | Icon-only button that shows a `Loader2` spinner when loading. Disables interaction while loading. | `action-icon-button.test.tsx` |
| `ConfirmDialog` | `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel?`, `cancelLabel?`, `variant?: "danger" \| "warning"`, `isPending?: boolean` | Modal confirmation dialog with alert icon. Auto-focuses the cancel button on open. Shows a spinner beside the confirm label when `isPending`. Built on `DialogShell`. | `confirm-dialog.test.tsx` |
| `DialogShell` | `open`, `onClose`, `ariaLabelledby`, `ariaDescribedby?`, `role?: "dialog" \| "alertdialog"`, `maxWidth?`, `className?`, `children` | Base dialog wrapper providing backdrop blur overlay, focus trapping, Escape-to-close, and entry animations. All dialogs in the app are built on this. | — |
| `Select` | `value`, `onChange`, `options: SelectOption[]`, `placeholder?`, `className?`, `aria-label?` | Custom dropdown with full keyboard navigation (Arrow keys, Home, End, Enter, Escape, Tab). Renders a listbox with checkmark indicators and scroll-into-view support. | — |
| `ToastContainer` | — | Renders active toasts in the bottom-right corner. Each toast auto-dismisses after its duration. | — |
| `ToggleSwitch` | `checked`, `onChange`, `label`, `description?`, `hideLabel?`, `className?` | Boolean toggle switch with ARIA `role="switch"`. Glows teal when checked (Catppuccin theme). | — |
| `ErrorBoundary` | `children`, `fallback?: ReactNode` | React class-based Error Boundary. Displays an error message with a "Try Again" button. Uses `react-i18next` `Translation` component for i18n support. | `error-boundary.test.tsx` |
| `RootLayout` | — | App shell: renders `Header`, page `Outlet`, `TerminalPanel`, `DebugConsole`, and `ToastContainer`. Registers `Ctrl+`` shortcut for terminal toggle and initializes the debug console. Includes skip-to-content link for accessibility. | — |

## 📂 Supporting Files

| File | Purpose |
|------|---------|
| `toast-store.ts` | Zustand store for toast state. Exports `useToastStore` and a convenience `toast` object with `success()`, `error()`, `warning()`, `info()` methods. Default durations: success/info 4s, warning 5s, error 6s. |

---

> 👀 See also: [shared/](../README.md) · [lib/](../lib/README.md) · [hooks/](../hooks/README.md) · [config/](../config/README.md)
