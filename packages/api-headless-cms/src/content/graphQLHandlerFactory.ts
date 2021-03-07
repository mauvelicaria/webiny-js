import { boolean } from "boolean";
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { CmsContext, CmsSettings } from "../types";
import { I18NLocale } from "@webiny/api-i18n/types";
import { NotAuthorizedError, NotAuthorizedResponse } from "@webiny/api-security";
import { ErrorResponse } from "@webiny/handler-graphql";
import { PluginCollection } from "@webiny/plugins/types";
import debugPlugins from "@webiny/handler-graphql/debugPlugins";
import processRequestBody from "@webiny/handler-graphql/processRequestBody";
import buildSchemaPlugins from "./plugins/buildSchemaPlugins";

interface CreateGraphQLHandlerOptions {
    debug?: boolean;
}
interface SchemaCache {
    key: string;
    schema: GraphQLSchema;
}
interface Args {
    context: CmsContext;
    type: string;
    locale: I18NLocale;
}
interface ParsedBody {
    query: string;
    variables: any;
    operationName: string;
}

const DEFAULT_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json"
};

const respond = (http, result: unknown) => {
    return http.response({
        body: JSON.stringify(result),
        statusCode: 200,
        headers: DEFAULT_HEADERS
    });
};
const schemaList = new Map<string, SchemaCache>();

const getLastModelChange = (settings?: CmsSettings): Date => {
    if (!settings || !settings.contentModelLastChange) {
        return new Date();
    }
    if (settings.contentModelLastChange instanceof Date) {
        return settings.contentModelLastChange;
    }
    try {
        return new Date(settings.contentModelLastChange);
    } catch {
        return new Date();
    }
};
const generateCacheKey = async (args: Args): Promise<string> => {
    const { context, locale, type } = args;
    const settings = await context.cms.settings.noAuth().get();
    const lastModelChange = getLastModelChange(settings);
    return [locale.code, type, lastModelChange.toISOString()].join("#");
};

const generateSchema = async (args: Args): Promise<GraphQLSchema> => {
    const { context } = args;

    const schemaPlugins = await buildSchemaPlugins(context);

    const typeDefs = [];
    const resolvers = [];

    // Get schema definitions from plugins
    for (const pl of schemaPlugins) {
        typeDefs.push(pl.schema.typeDefs);
        resolvers.push(pl.schema.resolvers);
    }

    return makeExecutableSchema({
        typeDefs,
        resolvers
    });
};
// gets an existing schema or rewrites existing one or creates a completely new one
// depending on the schemaId created from type and locale parameters
const getSchema = async (args: Args): Promise<GraphQLSchema> => {
    const { context, type, locale } = args;
    const tenantId = context.security.getTenant().id;
    const id = `${tenantId}#${type}#${locale.code}`;

    const cacheKey = await generateCacheKey(args);
    if (!schemaList.has(id)) {
        const schema = await generateSchema(args);

        schemaList.set(id, {
            key: cacheKey,
            schema
        });
        return schema;
    }
    const cache = schemaList.get(id);
    if (cache.key === cacheKey) {
        return cache.schema;
    }
    const schema = await generateSchema(args);
    schemaList.set(id, {
        key: cacheKey,
        schema
    });
    return schema;
};

const checkEndpointAccess = async (context: CmsContext): Promise<void> => {
    const permission = await context.security.getPermission(`cms.endpoint.${context.cms.type}`);
    if (!permission) {
        throw new NotAuthorizedError({
            data: {
                reason: `Not allowed to access "${context.cms.type}" endpoint.`
            }
        });
    }
};

export const graphQLHandlerFactory = (
    options: CreateGraphQLHandlerOptions = {}
): PluginCollection => {
    const debug = boolean(options.debug);

    return [
        ...(debug ? debugPlugins() : []),
        {
            type: "handler",
            name: "handler-graphql-content-model",
            async handle(context: CmsContext, next) {
                const { http } = context;

                if (!http || !http.request || !http.request.path || !http.request.path.parameters) {
                    return next();
                }

                if (http.request.method === "OPTIONS") {
                    return http.response({
                        statusCode: 204,
                        headers: DEFAULT_HEADERS
                    });
                }

                if (http.request.method !== "POST") {
                    return next();
                }

                try {
                    await checkEndpointAccess(context);
                } catch (ex) {
                    return respond(http, new NotAuthorizedResponse(ex));
                }

                try {
                    const schema = await getSchema({
                        context,
                        locale: context.cms.getLocale(),
                        type: context.cms.type
                    });

                    const body: ParsedBody | ParsedBody[] = JSON.parse(http.request.body);

                    const result = await processRequestBody(body, schema, context);
                    return respond(http, result);
                } catch (ex) {
                    const report = {
                        error: {
                            name: ex.constructor.name,
                            message: ex.message,
                            data: ex.data || {},
                            stack: ex.stack
                        }
                    };
                    const body = JSON.stringify(report);
                    console.log("[@webiny/api-headless-cms] An error occurred: ", body);

                    if (boolean(options.debug)) {
                        return context.http.response({
                            statusCode: 500,
                            body,
                            headers: {
                                ...DEFAULT_HEADERS,
                                "Cache-Control": "no-store"
                            }
                        });
                    }

                    return respond(
                        http,
                        new ErrorResponse({
                            message: ex.message,
                            code: ex.code || "GENERAL_ERROR",
                            data: ex.data || {}
                        })
                    );
                }
            }
        }
    ];
};
