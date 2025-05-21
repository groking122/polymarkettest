"use client";

import VoteGravityV1Display from "@/components/custom/VoteGravityV1Display";
import VoteGravityV2Display from "@/components/custom/VoteGravityV2Display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VoteGravityComparison() {
  return (
    <div className="container mx-auto p-4 max-w-[95vw]">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Vote Gravity Calculator Comparison
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <VoteGravityV1Display />
        </div>
        <div>
          <VoteGravityV2Display />
        </div>
      </div>
    </div>
  );
} 