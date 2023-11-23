import { getDocumentClient } from "@webiny/aws-sdk/client-dynamodb";
import { createHandler } from "@webiny/handler-aws/raw";
import i18nPlugins from "@webiny/api-i18n/graphql";
import i18nDynamoDbStorageOperations from "@webiny/api-i18n-ddb";
import { CmsParametersPlugin, createHeadlessCmsContext } from "@webiny/api-headless-cms";
import { createStorageOperations as createHeadlessCmsStorageOperations } from "@webiny/api-headless-cms-ddb-es";
import {
    createFormBuilderContext,
    createFormBuilderGraphQL
} from "@webiny/api-form-builder/cmsFormBuilderStorage/createFormBuilderContext";
import { createFormBuilderStorageOperations } from "@webiny/api-form-builder-so-ddb-es";
import {
    createPageBuilderGraphQL,
    createPageBuilderContext
} from "@webiny/api-page-builder/graphql";
import { createStorageOperations as createPageBuilderStorageOperations } from "@webiny/api-page-builder-so-ddb-es";
import pageBuilderImportExportPlugins from "@webiny/api-page-builder-import-export/graphql";
import { createStorageOperations as createPageBuilderImportExportStorageOperations } from "@webiny/api-page-builder-import-export-so-ddb";
import exportCombinePlugins from "@webiny/api-page-builder-import-export/export/combine";
import dbPlugins from "@webiny/handler-db";
import { DynamoDbDriver } from "@webiny/db-dynamodb";
import dynamoDbPlugins from "@webiny/db-dynamodb/plugins";
import elasticSearch, {
    createElasticsearchClient,
    createGzipCompression
} from "@webiny/api-elasticsearch";
import logsPlugins from "@webiny/handler-logs";
import securityPlugins from "./security";

const documentClient = getDocumentClient();

const elasticsearchClient = createElasticsearchClient({
    endpoint: `https://${process.env.ELASTIC_SEARCH_ENDPOINT}`
});

const debug = process.env.DEBUG === "true";

export const handler = createHandler({
    plugins: [
        dynamoDbPlugins(),
        logsPlugins(),
        createGzipCompression(),
        elasticSearch(elasticsearchClient),
        dbPlugins({
            table: process.env.DB_TABLE,
            driver: new DynamoDbDriver({ documentClient })
        }),
        securityPlugins({ documentClient }),
        i18nPlugins(),
        i18nDynamoDbStorageOperations(),
        new CmsParametersPlugin(async context => {
            const locale = context.i18n.getCurrentLocale("content")?.code || "en-US";
            return {
                type: "manage",
                locale
            };
        }),
        createHeadlessCmsContext({
            storageOperations: createHeadlessCmsStorageOperations({
                documentClient
            })
        }),
        createPageBuilderContext({
            storageOperations: createPageBuilderStorageOperations({
                documentClient,
                elasticsearch: elasticsearchClient
            })
        }),
        createPageBuilderGraphQL(),
        createFormBuilderContext({
            storageOperations: createFormBuilderStorageOperations({
                documentClient,
                elasticsearch: elasticsearchClient
            })
        }),
        createFormBuilderGraphQL(),
        pageBuilderImportExportPlugins({
            storageOperations: createPageBuilderImportExportStorageOperations({ documentClient })
        }),
        exportCombinePlugins()
    ],
    debug
});
