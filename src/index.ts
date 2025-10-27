#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import JSZip from "jszip";
import { promises as fs } from "fs";
import { dirname } from "path";

interface Topic {
  id: string;
  title: string;
  children: Topic[];
  parentId?: string;
}

interface MindMap {
  id: string;
  title: string;
  rootTopic: Topic;
}

// In-memory storage for mind maps
const mindMaps = new Map<string, MindMap>();
let topicIdCounter = 0;
let mindMapIdCounter = 0;

function generateTopicId(): string {
  return `topic_${++topicIdCounter}`;
}

function generateMindMapId(): string {
  return `mindmap_${++mindMapIdCounter}`;
}

function createXmlContent(mindMap: MindMap): string {
  function buildTopicXml(topic: Topic, indent: string = "    "): string {
    const childrenXml = topic.children.length > 0
      ? `\n${indent}  <children>\n${topic.children.map(child =>
          `${indent}    <topics type="attached">\n${buildTopicXml(child, indent + "      ")}\n${indent}    </topics>`
        ).join('\n')}\n${indent}  </children>\n${indent}`
      : "";

    return `${indent}<topic id="${topic.id}" timestamp="0">\n${indent}  <title>${escapeXml(topic.title)}</title>${childrenXml}</topic>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" version="2.0">
  <sheet id="sheet_1" timestamp="0">
    <title>${escapeXml(mindMap.title)}</title>
${buildTopicXml(mindMap.rootTopic)}
  </sheet>
</xmap-content>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createMetaXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<meta xmlns="urn:xmind:xmap:xmlns:meta:2.0" version="2.0">
  <Author>
    <Name>XMind MCP Server</Name>
  </Author>
</meta>`;
}

function createManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">
  <file-entry full-path="content.xml" media-type="text/xml"/>
  <file-entry full-path="META-INF/" media-type=""/>
  <file-entry full-path="META-INF/manifest.xml" media-type="text/xml"/>
  <file-entry full-path="meta.xml" media-type="text/xml"/>
</manifest>`;
}

async function saveToFile(mindMap: MindMap, filePath: string): Promise<void> {
  const zip = new JSZip();

  // Add content files
  zip.file("content.xml", createXmlContent(mindMap));
  zip.file("meta.xml", createMetaXml());

  // Add manifest in META-INF folder
  const metaInf = zip.folder("META-INF");
  if (metaInf) {
    metaInf.file("manifest.xml", createManifestXml());
  }

  // Generate zip file
  const content = await zip.generateAsync({ type: "nodebuffer" });

  // Ensure directory exists
  await fs.mkdir(dirname(filePath), { recursive: true });

  // Write to file
  await fs.writeFile(filePath, content);
}

function findTopicById(topic: Topic, id: string): Topic | null {
  if (topic.id === id) {
    return topic;
  }

  for (const child of topic.children) {
    const found = findTopicById(child, id);
    if (found) {
      return found;
    }
  }

  return null;
}

const tools: Tool[] = [
  {
    name: "create_mindmap",
    description: "Create a new mind map with a root topic",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the mind map",
        },
        rootTitle: {
          type: "string",
          description: "Title of the root topic",
        },
      },
      required: ["title", "rootTitle"],
    },
  },
  {
    name: "add_topic",
    description: "Add a new topic to an existing topic in the mind map",
    inputSchema: {
      type: "object",
      properties: {
        mindMapId: {
          type: "string",
          description: "ID of the mind map",
        },
        parentTopicId: {
          type: "string",
          description: "ID of the parent topic to add the new topic to",
        },
        title: {
          type: "string",
          description: "Title of the new topic",
        },
      },
      required: ["mindMapId", "parentTopicId", "title"],
    },
  },
  {
    name: "get_mindmap",
    description: "Get the structure of a mind map",
    inputSchema: {
      type: "object",
      properties: {
        mindMapId: {
          type: "string",
          description: "ID of the mind map",
        },
      },
      required: ["mindMapId"],
    },
  },
  {
    name: "list_mindmaps",
    description: "List all created mind maps",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "save_mindmap",
    description: "Save a mind map to an XMind file",
    inputSchema: {
      type: "object",
      properties: {
        mindMapId: {
          type: "string",
          description: "ID of the mind map",
        },
        filePath: {
          type: "string",
          description: "File path to save the mind map (should end with .xmind)",
        },
      },
      required: ["mindMapId", "filePath"],
    },
  },
];

const server = new Server(
  {
    name: "xmind-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "create_mindmap") {
      const { title, rootTitle } = args as { title: string; rootTitle: string };

      const mindMapId = generateMindMapId();
      const rootTopicId = generateTopicId();

      const mindMap: MindMap = {
        id: mindMapId,
        title,
        rootTopic: {
          id: rootTopicId,
          title: rootTitle,
          children: [],
        },
      };

      mindMaps.set(mindMapId, mindMap);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              mindMapId,
              rootTopicId,
              message: `Mind map "${title}" created successfully`,
            }, null, 2),
          },
        ],
      };
    }

    if (name === "add_topic") {
      const { mindMapId, parentTopicId, title } = args as {
        mindMapId: string;
        parentTopicId: string;
        title: string;
      };

      const mindMap = mindMaps.get(mindMapId);
      if (!mindMap) {
        throw new Error(`Mind map with ID ${mindMapId} not found`);
      }

      const parentTopic = findTopicById(mindMap.rootTopic, parentTopicId);
      if (!parentTopic) {
        throw new Error(`Topic with ID ${parentTopicId} not found`);
      }

      const newTopicId = generateTopicId();
      const newTopic: Topic = {
        id: newTopicId,
        title,
        children: [],
        parentId: parentTopicId,
      };

      parentTopic.children.push(newTopic);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              topicId: newTopicId,
              message: `Topic "${title}" added successfully`,
            }, null, 2),
          },
        ],
      };
    }

    if (name === "get_mindmap") {
      const { mindMapId } = args as { mindMapId: string };

      const mindMap = mindMaps.get(mindMapId);
      if (!mindMap) {
        throw new Error(`Mind map with ID ${mindMapId} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mindMap, null, 2),
          },
        ],
      };
    }

    if (name === "list_mindmaps") {
      const mindMapList = Array.from(mindMaps.values()).map(mm => ({
        id: mm.id,
        title: mm.title,
        rootTopicId: mm.rootTopic.id,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mindMapList, null, 2),
          },
        ],
      };
    }

    if (name === "save_mindmap") {
      const { mindMapId, filePath } = args as {
        mindMapId: string;
        filePath: string;
      };

      const mindMap = mindMaps.get(mindMapId);
      if (!mindMap) {
        throw new Error(`Mind map with ID ${mindMapId} not found`);
      }

      await saveToFile(mindMap, filePath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: `Mind map saved successfully to ${filePath}`,
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XMind MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
