import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Sparkles, Zap, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onPurchase: (amount: number) => void;
}

export const BuyCreditsModal = ({ isOpen, onClose, currentCredits, onPurchase }: BuyCreditsModalProps) => {
  const { toast } = useToast();

  const packages = [
    {
      credits: 50,
      price: "$9.99",
      icon: Coins,
      gradient: "from-blue-500 to-cyan-500",
      popular: false,
    },
    {
      credits: 100,
      price: "$17.99",
      icon: Sparkles,
      gradient: "from-purple-500 to-pink-500",
      popular: true,
      savings: "Save 10%"
    },
    {
      credits: 500,
      price: "$79.99",
      icon: Crown,
      gradient: "from-amber-500 to-orange-500",
      popular: false,
      savings: "Save 20%"
    }
  ];

  const handlePurchase = (amount: number, price: string) => {
    onPurchase(amount);
    toast({
      title: "Purchase Successful! 🎉",
      description: `${amount} credits added to your account`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold gradient-text text-center mb-2">
            Buy Credits
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Choose a credit package to continue creating amazing biographies
          </p>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Current Balance */}
          <Card className="card-glass border-2 border-primary/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">{currentCredits} Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card className="card-clean bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Credit Usage</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span><strong>10 credits</strong> per AI voice interview session</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span><strong>10 credits</strong> per biography cartoon generation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span><strong>5 credits</strong> per memory capture</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Packages */}
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <Card
                  key={pkg.credits}
                  className={`card-clean hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative ${
                    pkg.popular ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                      MOST POPULAR
                    </div>
                  )}
                  <CardContent className="p-6 text-center">
                    <div className={`h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{pkg.credits}</h3>
                    <p className="text-muted-foreground mb-2">Credits</p>
                    {pkg.savings && (
                      <div className="inline-block bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                        {pkg.savings}
                      </div>
                    )}
                    <div className="text-2xl font-bold mb-6 gradient-text">{pkg.price}</div>
                    <Button
                      variant={pkg.popular ? "gradient" : "outline"}
                      className={`w-full ${pkg.popular ? 'btn-glow' : ''}`}
                      onClick={() => handlePurchase(pkg.credits, pkg.price)}
                    >
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * This is a demo UI. No actual payment processing is implemented.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
