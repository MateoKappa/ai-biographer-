import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StoryInput from "./pages/StoryInput";
import StoryQuestions from "./pages/StoryQuestions";
import Results from "./pages/Results";
import Templates from "./pages/Templates";
import Session from "./pages/Session";
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
          <Route path="/story-questions/:storyId" element={<StoryQuestions />} />
          <Route path="/results/:storyId" element={<Results />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/session/:templateId" element={<Session />} />
          <Route path="/memory-book" element={<MemoryBook />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
