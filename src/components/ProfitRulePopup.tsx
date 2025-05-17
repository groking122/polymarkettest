"use client";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ProfitRulePopup() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs">💡 Take Profit Rule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md text-left space-y-4">
        <DialogTitle asChild>
          <h2 className="text-lg font-bold">📘 Rule of Thumb: When to Take Profit</h2>
        </DialogTitle>
        <DialogDescription asChild>
          <div>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                If your current value is **80–90% of your max payout**, consider taking profit.
              </li>
              <li>
                If the remaining upside is less than **$0.20**, it's often not worth the binary risk.
              </li>
              <li>
                If your confidence drops below **95%**, and you're close to breakeven or in green — exit is often safer.
              </li>
              <li>
                Even small gains help long-term edge compounding — **protect your capital** over perfection.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Based on Kelly strategy and expected value logic.
            </p>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
} 