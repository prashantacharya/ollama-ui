"use client"; // This directive makes this component a Client Component

import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown
import remarkGfm from "remark-gfm"; // Import remark-gfm for GitHub Flavored Markdown

// Define types for better type safety
interface OllamaModel {
  name: string;
  size: string;
  modified_at: string;
  description: string;
}

interface ChatMessage {
  id: string; // Unique ID for each message
  text: string;
  sender: "user" | "model";
  timestamp: Date;
}

// Custom component to render code blocks with a copy button
const CodeBlock = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).trim(); // Get the raw code content

  const handleCopy = () => {
    // Use document.execCommand('copy') for clipboard operations in iframes
    const textarea = document.createElement("textarea");
    textarea.value = codeContent;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
    } catch (err) {
      console.error("Failed to copy text:", err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // Extract language from className (e.g., "language-javascript")
  const language = className?.replace(/language-/g, "") || "plaintext";

  return (
    <div className="relative bg-gray-800 rounded-md my-4 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-700 text-gray-200 text-xs font-mono rounded-t-md">
        <span>{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className="px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs transition-colors duration-200"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-white text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

export default function HomePage() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [errorModels, setErrorModels] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Ref to scroll to the bottom of the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to fetch models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models"); // Call your API route
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setModels(data.models);
        // Automatically select the first model if available
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].name);
        }
      } catch (err: any) {
        setErrorModels(err.message);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Effect to scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedModel) {
      return; // Don't send empty messages or if no model is selected
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: chatInput,
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message to chat history
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setChatInput(""); // Clear input field
    setIsSendingMessage(true); // Set loading state for message sending

    try {
      // This fetch call goes to the /api/chat route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: userMessage.text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get completion: ${response.statusText}`);
      }

      const data = await response.json();
      const modelResponse: ChatMessage = {
        id: crypto.randomUUID(),
        text: data.completion || "No response from model.", // Assuming 'completion' field
        sender: "model",
        timestamp: new Date(),
      };

      // Add model's response to chat history
      setMessages((prevMessages) => [...prevMessages, modelResponse]);
    } catch (err: any) {
      console.error("Error sending message:", err);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        text: `Error: ${err.message || "Could not get response."}`,
        sender: "model",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsSendingMessage(false); // Reset loading state
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line in textarea
      handleSendMessage();
    }
  };

  if (loadingModels) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Loading models...</p>
      </div>
    );
  }

  if (errorModels) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <p className="text-lg text-red-700">
          Error loading models: {errorModels}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans antialiased">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ollama Chat UI</h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="model-select" className="text-lg">
            Model:
          </label>
          <select
            id="model-select"
            className="p-2 rounded-md bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-xl">Start a conversation!</p>
            <p className="text-md">
              Select a model and type your message below.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3/4 p-3 rounded-lg shadow-md ${message.sender === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-200 text-gray-800 rounded-bl-none prose prose-sm" // Added prose classes for markdown styling
                  }`}
              >
                <p className="text-sm font-semibold mb-1">
                  {message.sender === "user" ? "You" : selectedModel || "Model"}
                </p>
                {/* Use ReactMarkdown for model messages */}
                {message.sender === "model" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{ code: CodeBlock }} // Pass the custom CodeBlock component
                  >
                    {message.text}
                  </ReactMarkdown>
                ) : (
                  <p>{message.text}</p>
                )}
                <p className="text-xs text-right opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isSendingMessage && (
          <div className="flex justify-start">
            <div className="max-w-3/4 p-3 rounded-lg shadow-md bg-gray-200 text-gray-800 rounded-bl-none">
              <p className="text-sm font-semibold mb-1">
                {selectedModel || "Model"}
              </p>
              <p className="animate-pulse">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Scroll target */}
      </main>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <textarea
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-black"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedModel || isSendingMessage}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedModel || !chatInput.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
