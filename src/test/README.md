# 🧪 Test Utilities

> Shared test setup, helpers, and mocks for Vitest component tests.

---

## 🗂️ File Inventory

| File                  | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `setup.ts`            | Global test setup — imports `@testing-library/jest-dom/vitest` matchers and loads the Tauri mock |
| `test-utils.tsx`      | Provider wrappers for rendering components under test                |
| `mocks/tauri.ts`      | Mocks `@tauri-apps/api/core` (`invoke`) and `@tauri-apps/api/event` (`listen`) |

## 📦 Key Exports

### `renderWithProviders(ui, options?)`

Renders a React element wrapped with the providers every component needs:

- **`QueryClientProvider`** — TanStack Query client with retries disabled
- **`I18nextProvider`** — i18next instance for translations

```tsx
import { renderWithProviders } from "@/test/test-utils";

renderWithProviders(<MyComponent />);
```

### `createWrapper()`

Returns a standalone wrapper component for use with `renderHook`:

```tsx
import { createWrapper } from "@/test/test-utils";

renderHook(() => useMyHook(), { wrapper: createWrapper() });
```

### Tauri Mocks (`mocks/tauri.ts`)

Exports `mockInvoke` and `mockListen` — pre-configured `vi.fn()` stubs that replace Tauri's IPC layer so components can be tested without a native backend:

```tsx
import { mockInvoke } from "@/test/mocks/tauri";

mockInvoke.mockResolvedValue([{ name: "Ubuntu", state: "Running" }]);
```

## ▶️ Running Tests

```bash
npm run test                   # Run all frontend tests (vitest)
npx vitest run src/features/   # Run tests for a specific directory
npx vitest run src/shared/ui/  # Run a single test file by path
```

Tests are configured in `vitest.config.ts` with `setup.ts` loaded via the `setupFiles` option.

---

> 👀 See also: [`vitest.config.ts`](../../vitest.config.ts) — Vitest configuration and setup files.
