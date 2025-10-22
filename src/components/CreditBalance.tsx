import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { BuyCreditsModal } from "./BuyCreditsModal";

export const CreditBalance = () => {
  const [credits, setCredits] = useState(120); // Mock credits
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">{credits} Credits</span>
        </div>
        <Button 
          variant="gradient"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="btn-glow"
        >
          Buy Credits
        </Button>
      </div>
      <BuyCreditsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        currentCredits={credits}
        onPurchase={(amount) => setCredits(credits + amount)}
      />
    </>
  );
};
