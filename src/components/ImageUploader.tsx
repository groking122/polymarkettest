"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";

interface Voter {
  name: string;
  sentiment: "yes" | "no";
  shares: number;
  profit: number;
  volume: number;
}

interface ImageUploaderProps {
  onVotersExtracted: (voters: Voter[]) => void;
}

export default function ImageUploader({ onVotersExtracted }: ImageUploaderProps) {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from environment if available
  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (envApiKey) {
      setApiKey(envApiKey);
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImage(file);
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearImage = () => {
    setImage(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractJSONFromText = (text: string): any => {
    // First try direct parsing
    try {
      return JSON.parse(text);
    } catch (e) {
      // Then try to find array pattern
      const arrayMatch = text.match(/\[([\s\S]*)\]/);
      if (arrayMatch) {
        try {
          return JSON.parse(`[${arrayMatch[1]}]`);
        } catch (e) {
          // Continue to next method
        }
      }

      // Try to extract anything that looks like JSON
      const jsonPattern = /\[\s*{\s*"[^"]+"\s*:[\s\S]*?}\s*\]/g;
      const jsonMatch = text.match(jsonPattern);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Continue to next method
        }
      }

      // Last resort: remove any text before and after square brackets
      const startBracket = text.indexOf('[');
      const endBracket = text.lastIndexOf(']');
      if (startBracket !== -1 && endBracket !== -1 && startBracket < endBracket) {
        try {
          return JSON.parse(text.substring(startBracket, endBracket + 1));
        } catch (e) {
          throw new Error("Failed to parse JSON from response");
        }
      }

      throw new Error("No valid JSON found in response");
    }
  };

  const processImage = async () => {
    if (!image || !apiKey) {
      setError("Please upload an image and provide an API key");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Image = reader.result?.toString().split(',')[1];
        
        if (!base64Image) {
          setIsProcessing(false);
          throw new Error("Failed to convert image");
        }

        try {
          console.log("Sending request to OpenAI API");
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Extract voter data from this image. Return ONLY a valid JSON array of voters. Each voter must have these properties: name (string), sentiment (either 'yes' or 'no'), shares (number), profit (number), and volume (number). Format as exactly: [{name: 'name1', sentiment: 'yes', shares: 100, profit: 1000, volume: 15000}]"
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 2000,
              temperature: 0.2
            })
          });

          const data = await response.json();
          
          if (data.error) {
            setIsProcessing(false);
            throw new Error(data.error.message || "API error");
          }

          if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            setIsProcessing(false);
            throw new Error("Invalid response from API");
          }

          const content = data.choices[0].message.content.trim();
          console.log("API Response:", content);

          // Try to extract JSON from the response
          const extractedVoters = extractJSONFromText(content);
          console.log("Extracted voters:", extractedVoters);
          
          if (!Array.isArray(extractedVoters)) {
            setIsProcessing(false);
            throw new Error("Response is not a valid array");
          }
          
          // Validate and transform the data
          const processedVoters = extractedVoters.map((voter: any) => ({
            name: String(voter.name || ""),
            sentiment: (voter.sentiment || "").toLowerCase() === "yes" ? "yes" as const : "no" as const,
            shares: Number(voter.shares) || 0,
            profit: Number(voter.profit) || 0,
            volume: Number(voter.volume) || 0
          }));
          
          onVotersExtracted(processedVoters);
          setError(null);
        } catch (err: any) {
          console.error("Error processing API response:", err);
          setError(err.message || "Failed to process image data");
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(image);
    } catch (err: any) {
      console.error("Error processing image:", err);
      setError(err.message || "Failed to process image");
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-md dark:bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2 dark:text-gray-100">
          <Upload className="h-5 w-5" /> Upload Voter Data Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key" className="dark:text-gray-200">OpenAI API Key</Label>
          <div className="flex relative">
            <Input
              id="api-key"
              type={isApiKeyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="dark:bg-gray-800 dark:text-gray-100"
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
            >
              {isApiKeyVisible ? "Hide" : "Show"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {process.env.NEXT_PUBLIC_OPENAI_API_KEY 
              ? "API key loaded from environment" 
              : "Add your API key to .env.local as NEXT_PUBLIC_OPENAI_API_KEY"}
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
            imageUrl ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-400 dark:border-gray-700'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          
          {imageUrl ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-xs mx-auto">
                <img 
                  src={imageUrl} 
                  alt="Uploaded voter data" 
                  className="max-h-48 max-w-full mx-auto rounded-md shadow-md" 
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute -top-2 -right-2 rounded-full h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearImage();
                  }}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {image?.name}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Supports JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={processImage} 
          disabled={!image || !apiKey || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Image...
            </>
          ) : (
            'Extract Voter Data'
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 