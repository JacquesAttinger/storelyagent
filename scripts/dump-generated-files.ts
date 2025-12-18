#!/usr/bin/env bun
/**
 * Standalone script to dump generated files from a running agent
 * 
 * Usage:
 *   bun scripts/dump-generated-files.ts <agentId>
 * 
 * Example:
 *   bun scripts/dump-generated-files.ts 443404bc-4921-4029-89b9-3e5010b1b97a
 * 
 * This connects to the local dev server and fetches all generated files,
 * then saves them to ./output/<projectName>-<agentId>/
 */

const API_BASE = 'http://localhost:5173';
const OUTPUT_DIR = './output';

interface FileData {
    filePath: string;
    fileContents: string;
    filePurpose: string;
}

interface ApiResponse {
    success: boolean;
    data?: {
        projectName: string;
        files: FileData[];
    };
    error?: string;
}

async function main() {
    const agentId = process.argv[2];

    if (!agentId) {
        console.error('Usage: bun scripts/dump-generated-files.ts <agentId>');
        console.error('');
        console.error('Get the agentId from the URL when viewing your store:');
        console.error('  http://localhost:5173/apps/<agentId>');
        process.exit(1);
    }

    console.log(`\n📦 Fetching generated files for agent: ${agentId}\n`);

    try {
        // Fetch files from API
        const response = await fetch(`${API_BASE}/api/agent/${agentId}/files`, {
            headers: {
                // Include a cookie or auth header if needed
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error ${response.status}: ${text}`);
        }

        const result = await response.json() as ApiResponse;

        if (!result.success || !result.data) {
            throw new Error(result.error || 'No data returned from API');
        }

        const { projectName, files } = result.data;

        if (files.length === 0) {
            console.log('⚠️  No generated files found for this agent.');
            console.log('   Make sure a store generation has completed.');
            process.exit(0);
        }

        const outputPath = `${OUTPUT_DIR}/${projectName}-${agentId.slice(0, 8)}`;

        console.log(`📁 Project: ${projectName}`);
        console.log(`📂 Output: ${outputPath}`);
        console.log(`📄 Files: ${files.length}\n`);

        // Import fs and path
        const fs = await import('node:fs');
        const path = await import('node:path');

        // Create output directory
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        let filesWritten = 0;

        for (const file of files) {
            try {
                const normalizedPath = file.filePath.startsWith('/')
                    ? file.filePath.slice(1)
                    : file.filePath;

                const fullPath = path.join(outputPath, normalizedPath);
                const dirPath = path.dirname(fullPath);

                // Create parent directories
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                // Write file
                fs.writeFileSync(fullPath, file.fileContents, 'utf-8');
                filesWritten++;
                console.log(`  ✅ ${normalizedPath}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.log(`  ❌ ${file.filePath} - ${errorMsg}`);
            }
        }

        console.log(`\n🎉 Successfully saved ${filesWritten}/${files.length} files to ${outputPath}`);
        console.log(`\n📖 Open in VS Code:`);
        console.log(`   code ${outputPath}\n`);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Error: ${errorMsg}`);
        console.error('\nMake sure:');
        console.error('  1. The dev server is running (bun run dev)');
        console.error('  2. You are logged in (the API requires authentication)');
        console.error('  3. The agentId is correct');
        console.error('  4. A store generation has completed\n');
        process.exit(1);
    }
}

main();
