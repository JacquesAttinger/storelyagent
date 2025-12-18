import { z } from 'zod';

/**
 * Converts a Zod schema to a JSON Schema compatible with Anthropic's structured outputs.
 * 
 * Based on Anthropic's structured outputs documentation:
 * https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 * 
 * Limitations (per Anthropic docs):
 * - No recursive schemas
 * - No complex types within enums  
 * - No external $ref
 * - No numerical constraints (minimum, maximum, multipleOf)
 * - No string constraints (minLength, maxLength)
 * - Array minItems only supports 0 or 1
 * - additionalProperties must be false for objects
 */

type JsonSchema = {
    type?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
    items?: JsonSchema;
    enum?: (string | number | boolean | null)[];
    const?: unknown;
    anyOf?: JsonSchema[];
    allOf?: JsonSchema[];
    $ref?: string;
    $defs?: Record<string, JsonSchema>;
    definitions?: Record<string, JsonSchema>;
    default?: unknown;
    description?: string;
    format?: string;
    minItems?: number;
    nullable?: boolean;
};

/**
 * Convert a Zod schema to JSON Schema for Anthropic's structured outputs
 */
export function zodToJsonSchema<T extends z.ZodTypeAny>(
    schema: T,
    definitions: Record<string, JsonSchema> = {}
): JsonSchema {
    return processZodType(schema, definitions);
}

function processZodType(
    schema: z.ZodTypeAny,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const typeName = schema._def.typeName;

    switch (typeName) {
        case 'ZodString':
            return processString(schema as z.ZodString);
        case 'ZodNumber':
            return { type: 'number' };
        case 'ZodBigInt':
            return { type: 'integer' };
        case 'ZodBoolean':
            return { type: 'boolean' };
        case 'ZodNull':
            return { type: 'null' };
        case 'ZodUndefined':
            // Undefined is not a valid JSON type, treat as null
            return { type: 'null' };
        case 'ZodLiteral':
            return processLiteral(schema as z.ZodLiteral<unknown>);
        case 'ZodEnum':
            return processEnum(schema as z.ZodEnum<[string, ...string[]]>);
        case 'ZodNativeEnum':
            return processNativeEnum(schema as z.ZodNativeEnum<any>);
        case 'ZodArray':
            return processArray(schema as z.ZodArray<z.ZodTypeAny>, definitions);
        case 'ZodObject':
            return processObject(schema as z.ZodObject<any>, definitions);
        case 'ZodUnion':
            return processUnion(schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>, definitions);
        case 'ZodDiscriminatedUnion':
            return processDiscriminatedUnion(schema as z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>, definitions);
        case 'ZodIntersection':
            return processIntersection(schema as z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>, definitions);
        case 'ZodTuple':
            return processTuple(schema as z.ZodTuple<[z.ZodTypeAny, ...z.ZodTypeAny[]]>, definitions);
        case 'ZodRecord':
            return processRecord(schema as z.ZodRecord<z.ZodString, z.ZodTypeAny>, definitions);
        case 'ZodOptional':
            return processOptional(schema as z.ZodOptional<z.ZodTypeAny>, definitions);
        case 'ZodNullable':
            return processNullable(schema as z.ZodNullable<z.ZodTypeAny>, definitions);
        case 'ZodDefault':
            return processDefault(schema as z.ZodDefault<z.ZodTypeAny>, definitions);
        case 'ZodEffects':
            // Effects (transforms, refinements) - just process the inner type
            return processZodType((schema as z.ZodEffects<z.ZodTypeAny>)._def.schema, definitions);
        case 'ZodLazy':
            // Lazy types - evaluate and process
            return processZodType((schema as z.ZodLazy<z.ZodTypeAny>)._def.getter(), definitions);
        case 'ZodAny':
            return {}; // Any type - no constraints
        case 'ZodUnknown':
            return {}; // Unknown type - no constraints
        case 'ZodNever':
            // Never type - should not appear in valid output
            return { type: 'null' };
        case 'ZodVoid':
            return { type: 'null' };
        case 'ZodDate':
            return { type: 'string', format: 'date-time' };
        case 'ZodBranded':
            return processZodType((schema as any)._def.type, definitions);
        case 'ZodCatch':
            return processZodType((schema as any)._def.innerType, definitions);
        case 'ZodPipeline':
            return processZodType((schema as any)._def.out, definitions);
        case 'ZodReadonly':
            return processZodType((schema as any)._def.innerType, definitions);
        default:
            console.warn(`Unhandled Zod type: ${typeName}`);
            return {};
    }
}

function processString(schema: z.ZodString): JsonSchema {
    const result: JsonSchema = { type: 'string' };
    
    // Check for format constraints in checks
    const checks = schema._def.checks || [];
    for (const check of checks) {
        const kind = check.kind as string;
        switch (kind) {
            case 'email':
                result.format = 'email';
                break;
            case 'url':
                result.format = 'uri';
                break;
            case 'uuid':
                result.format = 'uuid';
                break;
            case 'datetime':
                result.format = 'date-time';
                break;
            case 'date':
                result.format = 'date';
                break;
            case 'time':
                result.format = 'time';
                break;
            case 'ip':
                result.format = (check as { version?: string }).version === 'v6' ? 'ipv6' : 'ipv4';
                break;
            // Note: Anthropic doesn't support minLength/maxLength constraints
        }
    }
    
    return result;
}

function processLiteral(schema: z.ZodLiteral<unknown>): JsonSchema {
    const value = schema._def.value;
    return { const: value };
}

function processEnum(schema: z.ZodEnum<[string, ...string[]]>): JsonSchema {
    return { enum: schema._def.values };
}

function processNativeEnum(schema: z.ZodNativeEnum<any>): JsonSchema {
    const enumObj = schema._def.values;
    // Get only the values (not the reverse mappings for numeric enums)
    const values = Object.values(enumObj).filter(
        (val) => typeof val === 'string' || typeof val === 'number'
    );
    return { enum: values as (string | number)[] };
}

function processArray(schema: z.ZodArray<z.ZodTypeAny>, definitions: Record<string, JsonSchema>): JsonSchema {
    const result: JsonSchema = {
        type: 'array',
        items: processZodType(schema._def.type, definitions),
    };
    
    // Anthropic only supports minItems of 0 or 1
    const minLength = schema._def.minLength?.value;
    if (minLength !== undefined && (minLength === 0 || minLength === 1)) {
        result.minItems = minLength;
    }
    
    return result;
}

function processObject(schema: z.ZodObject<any>, definitions: Record<string, JsonSchema>): JsonSchema {
    const shape = schema._def.shape();
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as z.ZodTypeAny;
        properties[key] = processZodType(zodValue, definitions);
        
        // Add description if present
        if (zodValue._def.description) {
            properties[key].description = zodValue._def.description;
        }
        
        // Check if field is required (not optional)
        if (!isOptional(zodValue)) {
            required.push(key);
        }
    }
    
    return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false, // Required by Anthropic
    };
}

function isOptional(schema: z.ZodTypeAny): boolean {
    const typeName = schema._def.typeName;
    if (typeName === 'ZodOptional') return true;
    if (typeName === 'ZodDefault') return true;
    if (typeName === 'ZodNullable') {
        // Nullable is not the same as optional - field is required but can be null
        return false;
    }
    return false;
}

function processUnion(
    schema: z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const options = schema._def.options.map((opt: z.ZodTypeAny) => 
        processZodType(opt, definitions)
    );
    return { anyOf: options };
}

function processDiscriminatedUnion(
    schema: z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const options = schema._def.options.map((opt: z.ZodTypeAny) => 
        processZodType(opt, definitions)
    );
    return { anyOf: options };
}

function processIntersection(
    schema: z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const left = processZodType(schema._def.left, definitions);
    const right = processZodType(schema._def.right, definitions);
    return { allOf: [left, right] };
}

function processTuple(
    schema: z.ZodTuple<[z.ZodTypeAny, ...z.ZodTypeAny[]]>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    // JSON Schema doesn't have a direct tuple type, use array with items
    const items = schema._def.items.map((item: z.ZodTypeAny) => 
        processZodType(item, definitions)
    );
    
    // Use anyOf for the items to allow any of the tuple types
    return {
        type: 'array',
        items: items.length === 1 ? items[0] : { anyOf: items },
    };
}

function processRecord(
    _schema: z.ZodRecord<z.ZodString, z.ZodTypeAny>,
    _definitions: Record<string, JsonSchema>
): JsonSchema {
    // Records are objects with dynamic keys
    // Note: Anthropic requires additionalProperties: false, so records might not work perfectly
    return {
        type: 'object',
        additionalProperties: false,
    };
}

function processOptional(
    schema: z.ZodOptional<z.ZodTypeAny>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    return processZodType(schema._def.innerType, definitions);
}

function processNullable(
    schema: z.ZodNullable<z.ZodTypeAny>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const innerSchema = processZodType(schema._def.innerType, definitions);
    // Use anyOf to allow null
    return {
        anyOf: [innerSchema, { type: 'null' }],
    };
}

function processDefault(
    schema: z.ZodDefault<z.ZodTypeAny>,
    definitions: Record<string, JsonSchema>
): JsonSchema {
    const innerSchema = processZodType(schema._def.innerType, definitions);
    const defaultValue = schema._def.defaultValue();
    return {
        ...innerSchema,
        default: defaultValue,
    };
}

/**
 * Wrap a JSON Schema for use with Anthropic's output_format parameter
 */
export function createAnthropicOutputFormat(
    schema: z.ZodTypeAny,
    _name?: string
): {
    type: 'json_schema';
    schema: JsonSchema;
} {
    const jsonSchema = zodToJsonSchema(schema);
    
    // Ensure root is an object with additionalProperties: false
    if (jsonSchema.type !== 'object') {
        // Wrap non-object schemas in an object
        return {
            type: 'json_schema',
            schema: {
                type: 'object',
                properties: {
                    result: jsonSchema,
                },
                required: ['result'],
                additionalProperties: false,
            },
        };
    }
    
    return {
        type: 'json_schema',
        schema: jsonSchema,
    };
}

