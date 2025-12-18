import { ChatCompletionFunctionTool } from 'openai/resources';

// SSE-based MCP server (remote, accessible via URL)
export interface MCPSSEServerConfig {
	name: string;
	type: 'sse';
	sseUrl: string;
}

export type MCPServerConfig = MCPSSEServerConfig;

// Legacy alias for backwards compatibility
export type MCPSSEConfig = MCPSSEServerConfig;
export interface MCPResult {
	content: string;
}

export interface ErrorResult {
	error: string;
}

export interface ToolCallResult {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	result?: unknown;
}

export type ToolImplementation<TArgs = Record<string, unknown>, TResult = unknown> = 
	(args: TArgs) => Promise<TResult>;

export type ToolDefinition<
    TArgs = Record<string, unknown>,
    TResult = unknown
> = ChatCompletionFunctionTool & {
    implementation: ToolImplementation<TArgs, TResult>;
    onStart?: (args: TArgs) => void;
    onComplete?: (args: TArgs, result: TResult) => void;
};

export type ExtractToolArgs<T> = T extends ToolImplementation<infer A, any> ? A : never;

export type ExtractToolResult<T> = T extends ToolImplementation<any, infer R> ? R : never;