import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StoryInput from "./pages/StoryInput";
import BiographyChat from "./pages/BiographyChat";
import BiographySettings from "./pages/BiographySettings";
import Results from "./pages/Results";
import MemoryBook from "./pages/MemoryBook";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/create" element={<StoryInput />} />
          <Route path="/biography" element={<BiographyChat />} />
          <Route path="/biography-settings/:storyId" element={<BiographySettings />} />
          <Route path="/results/:storyId" element={<Results />} />
          <Route path="/memory-book" element={<MemoryBook />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
