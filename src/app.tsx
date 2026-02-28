import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "@/shared/config/query-client";
import { useThemeSync } from "@/shared/hooks/use-theme";
import { useLocaleSync } from "@/shared/stores/use-locale-store";
import { router } from "./router";

function App() {
  useThemeSync();
  useLocaleSync();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
