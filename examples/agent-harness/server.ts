#!/usr/bin/env bun
/**
 * Agent Harness Server
 * 
 * A custom AI agent harness with HTTP API for n8n integration.
 * Replaces OpenAI node in n8n workflows.
 * 
 * Features:
 * - HTTP endpoint for n8n webhooks
 * - Per-conversation system prompts that evolve over time
 * - Conversation memory and notes
 * - Automatic summary creation
 * - Integration with Ollama or OpenAI
 * 
 * Usage:
 *   bun run server.ts                    # Start server
 *   PORT=3001 bun run server.ts         # Custom port
 *   LLM_PROVIDER=ollama bun run server.ts
 *   LLM_PROVIDER=openai bun run server.ts
 */

import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";

// ============== CONFIGURATION ==============

const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001"),
  HOST: process.env.HOST || "0.0.0.0",
  CONVERSATIONS_DIR: process.env.CONVERSATIONS_DIR || join(import.meta.dir, "conversations"),
  LOGS_DIR: process.env.LOGS_DIR || join(import.meta.dir, "logs"),
  LLM_PROVIDER: process.env.LLM_PROVIDER || "openai", // "openai" or "ollama"
  
  // OpenAI config (use Codex subscription here)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "o1",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  
  // Ollama config
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3",
  
  // Summary threshold (number of messages before summarizing)
  SUMMARY_THRESHOLD: parseInt(process.env.SUMMARY_THRESHOLD || "10"),
  
  // Max conversation history to keep in context
  MAX_HISTORY_MESSAGES: parseInt(process.env.MAX_HISTORY_MESSAGES || "20"),
};

// ============== TYPES ==============

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  system_prompt: string;
  messages: Message[];
  summary?: string;
  metadata?: Record<string, any>;
}

interface RequestBody {
  conversation_id?: string;        // Existing conversation ID (or create new)
  message: string;                  // User message
  system_prompt?: string;           // Optional: override system prompt
  metadata?: Record<string, any>;   // Optional: custom metadata
  model?: string;                   // Optional: override model
  temperature?: number;              // Optional: override temperature
}

interface ResponseBody {
  conversation_id: string;
  response: string;
  system_prompt: string;
  message_count: number;
  summary?: string;
}

// ============== CONVERSATION MANAGEMENT ==============

class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  
  constructor(private baseDir: string) {
    this.ensureDirectories();
  }
  
  private async ensureDirectories() {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
  }
  
  private getFilePath(conversationId: string): string {
    return join(this.baseDir, `${conversationId}.json`);
  }
  
  async createConversation(systemPrompt?: string): Promise<Conversation> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const conversation: Conversation = {
      id,
      created_at: now,
      updated_at: now,
      system_prompt: systemPrompt || this.getDefaultSystemPrompt(),
      messages: [],
    };
    
    this.conversations.set(id, conversation);
    await this.saveConversation(conversation);
    
    console.log(`📝 Created new conversation: ${id}`);
    return conversation;
  }
  
  async getConversation(id: string): Promise<Conversation | null> {
    // Check memory first
    if (this.conversations.has(id)) {
      return this.conversations.get(id)!;
    }
    
    // Try loading from disk
    const filePath = this.getFilePath(id);
    if (existsSync(filePath)) {
      try {
        const content = await readFile(filePath, "utf-8");
        const conversation = JSON.parse(content) as Conversation;
        this.conversations.set(id, conversation);
        return conversation;
      } catch (e) {
        console.error(`Error loading conversation ${id}:`, e);
        return null;
      }
    }
    
    return null;
  }
  
  async addMessage(
    conversationId: string, 
    role: "user" | "assistant", 
    content: string
  ): Promise<Conversation> {
    let conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      conversation = await this.createConversation();
    }
    
    const message: Message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    
    conversation.messages.push(message);
    conversation.updated_at = new Date().toISOString();
    
    // Check if we need to summarize
    if (conversation.messages.length >= CONFIG.SUMMARY_THRESHOLD) {
      await this.summarizeConversation(conversation);
    }
    
    this.conversations.set(conversationId, conversation);
    await this.saveConversation(conversation);
    
    return conversation;
  }
  
  async updateSystemPrompt(conversationId: string, newPrompt: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (conversation) {
      conversation.system_prompt = newPrompt;
      conversation.updated_at = new Date().toISOString();
      this.conversations.set(conversationId, conversation);
      await this.saveConversation(conversation);
      console.log(`🔄 Updated system prompt for ${conversationId}`);
    }
  }
  
  async summarizeConversation(conversation: Conversation): Promise<string> {
    if (conversation.messages.length < CONFIG.SUMMARY_THRESHOLD) {
      return conversation.summary || "";
    }
    
    // Create a summary of the conversation
    const userMessages = conversation.messages
      .filter(m => m.role === "user")
      .map(m => m.content);
    
    const assistantMessages = conversation.messages
      .filter(m => m.role === "assistant")
      .map(m => m.content);
    
    const summary = `## Conversation Summary
    
**Total Messages:** ${conversation.messages.length}
**Created:** ${conversation.created_at}
**Last Updated:** ${conversation.updated_at}

### User Requests:
${userMessages.map((m, i) => `${i + 1}. ${m.substring(0, 100)}...`).join("\n")}

### Key Responses:
${assistantMessages.slice(-3).map((m, i) => `${i + 1}. ${m.substring(0, 150)}...`).join("\n")}

### Evolved System Prompt:
${conversation.system_prompt}
`;
    
    conversation.summary = summary;
    
    // Also save summary to a separate file
    const summaryPath = join(CONFIG.CONVERSATIONS_DIR, `${conversation.id}_summary.md`);
    await writeFile(summaryPath, summary, "utf-8");
    
    console.log(`📄 Created summary for conversation ${conversation.id}`);
    return summary;
  }
  
  private async saveConversation(conversation: Conversation): Promise<void> {
    const filePath = this.getFilePath(conversation.id);
    await writeFile(filePath, JSON.stringify(conversation, null, 2), "utf-8");
  }
  
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant. 
- Be concise and friendly.
- Provide accurate information.
- If you don't know something, say so.
- Always maintain context from the conversation.`;
  }
  
  async listConversations(): Promise<string[]> {
    await this.ensureDirectories();
    const files = await readdir(this.baseDir);
    return files
      .filter(f => f.endsWith(".json") && !f.includes("_summary"))
      .map(f => f.replace(".json", ""));
  }
}

// ============== LLM CLIENT ==============

class LLMClient {
  async chat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
  }): Promise<string> {
    if (CONFIG.LLM_PROVIDER === "ollama") {
      return this.ollamaChat(messages, options);
    } else {
      return this.openaiChat(messages, options);
    }
  }
  
  private async ollamaChat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
  }): Promise<string> {
    const response = await fetch(`${CONFIG.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options?.model || CONFIG.OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.message?.content || "";
  }
  
  private async openaiChat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
  }): Promise<string> {
    const response = await fetch(`${CONFIG.OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model || CONFIG.OPENAI_MODEL,
        messages,
        temperature: options?.temperature || 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || "";
  }
}

// ============== MAIN SERVER ==============

const conversationManager = new ConversationManager(CONFIG.CONVERSATIONS_DIR);
const llmClient = new LLMClient();

// Health check
const healthHandler = (): ResponseBody => ({
  conversation_id: "",
  response: "Agent Harness Server is running",
  system_prompt: "",
  message_count: 0,
});

// Process message handler
const messageHandler = async (body: RequestBody): Promise<ResponseBody> => {
  const { 
    conversation_id, 
    message, 
    system_prompt, 
    metadata,
    model,
    temperature 
  } = body;
  
  // Get or create conversation
  let conversation = conversation_id 
    ? await conversationManager.getConversation(conversation_id)
    : null;
  
  if (!conversation) {
    conversation = await conversationManager.createConversation(system_prompt);
  } else if (system_prompt) {
    // Update system prompt if provided
    await conversationManager.updateSystemPrompt(conversation.id, system_prompt);
    conversation.system_prompt = system_prompt;
  }
  
  // Add user message
  await conversationManager.addMessage(conversation.id, "user", message);
  
  // Build messages for LLM
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: conversation.system_prompt },
  ];
  
  // Add conversation history (limited)
  const recentMessages = conversation.messages.slice(-CONFIG.MAX_HISTORY_MESSAGES);
  for (const msg of recentMessages) {
    messages.push({ role: msg.role, content: msg.content });
  }
  
  // Get LLM response
  const response = await llmClient.chat(messages, { model, temperature });
  
  // Add assistant message
  await conversationManager.addMessage(conversation.id, "assistant", response);
  
  // Reload conversation to get updated state
  const updatedConversation = await conversationManager.getConversation(conversation.id)!;
  
  return {
    conversation_id: updatedConversation.id,
    response,
    system_prompt: updatedConversation.system_prompt,
    message_count: updatedConversation.messages.length,
    summary: updatedConversation.summary,
  };
};

// List conversations handler
const listHandler = async (): Promise<{ conversations: string[] }> => {
  const conversations = await conversationManager.listConversations();
  return { conversations };
};

// Get conversation handler
const getHandler = async (id: string): Promise<Conversation | null> => {
  return await conversationManager.getConversation(id);
};

// Update system prompt handler
const updateSystemPromptHandler = async (
  id: string, 
  newPrompt: string
): Promise<{ success: boolean; conversation_id: string }> => {
  await conversationManager.updateSystemPrompt(id, newPrompt);
  return { success: true, conversation_id: id };
};

// ============== HTTP SERVER ==============

const server = Bun.serve({
  port: CONFIG.PORT,
  hostname: CONFIG.HOST,
  
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    // Handle preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Routes
      if (path === "/health" && method === "GET") {
        return Response.json(healthHandler(), { headers: corsHeaders });
      }
      
      if (path === "/conversations" && method === "GET") {
        return Response.json(await listHandler(), { headers: corsHeaders });
      }
      
      if (path === "/message" && method === "POST") {
        const body = await req.json() as RequestBody;
        const result = await messageHandler(body);
        return Response.json(result, { headers: corsHeaders });
      }
      
      if (path.startsWith("/conversations/") && method === "GET") {
        const id = path.split("/").pop()!;
        const conversation = await getHandler(id);
        if (!conversation) {
          return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
        }
        return Response.json(conversation, { headers: corsHeaders });
      }
      
      if (path.startsWith("/conversations/") && method === "PUT") {
        const id = path.split("/").pop()!;
        const body = await req.json() as { system_prompt: string };
        const result = await updateSystemPromptHandler(id, body.system_prompt);
        return Response.json(result, { headers: corsHeaders });
      }
      
      // 404
      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error("Error:", error);
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🤖 Agent Harness Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://${CONFIG.HOST}:${CONFIG.PORT}                ║
║  LLM Provider: ${CONFIG.LLM_PROVIDER.toUpperCase().padEnd(38)}║
║  Model: ${(CONFIG.LLM_PROVIDER === "ollama" ? CONFIG.OLLAMA_MODEL : CONFIG.OPENAI_MODEL).padEnd(44)}║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  - GET  /health                    - Health check        ║
║  - GET  /conversations            - List all convos     ║
║  - POST /message                  - Send message        ║
║  - GET  /conversations/:id       - Get conversation    ║
║  - PUT  /conversations/:id       - Update system prompt║
╠═══════════════════════════════════════════════════════════╣
║  n8n Integration Example:                                ║
║  URL: http://${CONFIG.HOST}:${CONFIG.PORT}/message                   ║
║  Method: POST                                           ║
║  Body: {"message": "your prompt here"}                 ║
╚═══════════════════════════════════════════════════════════╝
`);
