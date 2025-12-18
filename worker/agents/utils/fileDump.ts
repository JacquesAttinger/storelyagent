/**
 * Local file dump utility for development
 * Logs generated files to console with summary
 * 
 * NOTE: In Cloudflare Workers environment, Node.js fs is not available.
 * This utility logs file summaries to console for visibility.
 * Use the standalone script (scripts/dump-generated-files.ts) to save files to disk.
 */

/**
 * Dump generated files summary to console
 * Only works in development mode (DEV_MODE=true)
 */
export async function dumpFilesToLocal(
    agentId: string,
    projectName: string,
    files: Array<{ filePath: string; fileContents: string }>
): Promise<string | null> {
    // Only run in dev mode
    const isDev = process.env.DEV_MODE === 'true';
    if (!isDev) {
        return null;
    }

    if (files.length === 0) {
        console.log('[FileDump] No files to dump');
        return null;
    }

    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
    const shortAgentId = agentId.slice(0, 8);
    const outputPath = `./output/${sanitizedProjectName}-${shortAgentId}`;

    // Log file summary to console
    console.log(`\n\x1b[36m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[33m📁 Generated Code - ${files.length} files\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[37mProject: ${projectName}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[37mAgent: ${agentId}\x1b[0m`);
    console.log(`\x1b[36m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);

    // Log each file path with size
    let totalSize = 0;
    for (const file of files) {
        const size = file.fileContents.length;
        totalSize += size;
        const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[32m✓\x1b[0m ${file.filePath} \x1b[90m(${sizeStr})\x1b[0m`);
    }

    const totalSizeStr = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)}KB` : `${totalSize}B`;
    console.log(`\x1b[36m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[37mTotal: ${totalSizeStr}\x1b[0m`);
    console.log(`\x1b[36m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[33m💡 To save files locally, run:\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[37m   bun scripts/dump-generated-files.ts ${agentId}\x1b[0m`);
    console.log(`\x1b[36m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

    return outputPath;
}

/**
 * Log file dump location for user visibility (kept for API compatibility)
 */
export function logFileDumpLocation(_outputPath: string | null): void {
    // Location already logged by dumpFilesToLocal
}
