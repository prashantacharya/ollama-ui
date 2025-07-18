import { NextResponse } from "next/server";
import ollama from "ollama";

export async function GET() {
  try {
    const { models } = await ollama.list();

    return NextResponse.json(
      {
        models: models.map((model) => ({
          ...model,
          size: (model.size / 1024 / 1024 / 1024).toFixed(2) + " GB",
        })),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching Ollama models:", error);
    return NextResponse.json(
      { message: "Failed to retrieve Ollama models", error: error.message },
      { status: 500 },
    );
  }
}
