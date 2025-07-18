import { NextResponse } from "next/server";
import ollama from "ollama"; // Import the ollama client library

/**
 * Handles POST requests to /api/chat for Ollama model completions.
 * This route will forward the user's prompt to the selected Ollama model
 * using the 'ollama' client library and return its response.
 *
 * @param request The incoming request object containing the model and prompt.
 * @returns A JSON response with the model's completion.
 */
export async function POST(request: Request) {
  try {
    const { model, prompt } = await request.json();

    if (!model || !prompt) {
      return NextResponse.json(
        { message: "Missing model or prompt in request body." },
        { status: 400 },
      );
    }

    // The 'ollama' client automatically uses OLLAMA_HOST environment variable
    // or defaults to 'http://localhost:11434'.
    // You can also configure it explicitly if needed:
    // const ollamaClient = new ollama.Ollama({ host: 'http://localhost:11434' });

    // Use the ollama.chat method to send the message
    const response = await ollama.chat({
      model: model,
      messages: [{ role: "user", content: prompt }], // Format the prompt as a message object
      // You can add other parameters here, e.g., stream: false
    });

    console.log("Response from Ollama:", response);

    // The completion content is found in response.message.content
    const completion = response.message.content;

    return NextResponse.json({ completion }, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    // Provide a more user-friendly error message for the frontend
    let errorMessage = "Failed to get completion from Ollama.";
    if (error.message.includes("connect ECONNREFUSED")) {
      errorMessage = "Could not connect to Ollama server. Is it running?";
    } else if (error.message.includes("404 Not Found")) {
      errorMessage = `Model '${model}' not found on Ollama server.`;
    } else {
      errorMessage = error.message; // Fallback to raw error message for debugging
    }

    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 500 },
    );
  }
}
