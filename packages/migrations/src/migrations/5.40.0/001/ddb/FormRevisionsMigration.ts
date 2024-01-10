import { Table } from "@webiny/db-dynamodb/toolbox";
import { DataMigration, DataMigrationContext } from "@webiny/data-migration";
import { createFormEntity } from "../entities/createFormEntity";
import { createDdbCmsEntity } from "../entities/createCmsEntity";
import { batchWriteAll, ddbQueryAllWithCallback, forEachTenantLocale, queryOne } from "~/utils";
import { executeWithRetry } from "@webiny/utils";

import { createEntryCommonFields } from "../utils";
import { FbForm, MigrationCheckpoint } from "../types";

export class FormBuilder_5_40_0_001_FormRevisions implements DataMigration<MigrationCheckpoint> {
    private readonly formEntity: ReturnType<typeof createFormEntity>;
    private readonly cmsEntity: ReturnType<typeof createDdbCmsEntity>;
    private readonly table: Table<string, string, string>;

    constructor(table: Table<string, string, string>) {
        this.table = table;
        this.formEntity = createFormEntity(table);
        this.cmsEntity = createDdbCmsEntity(table);
    }

    getId() {
        return "Form Revision Entries";
    }

    getDescription() {
        return "";
    }

    async shouldExecute({ logger }: DataMigrationContext): Promise<boolean> {
        let shouldExecute = false;

        await forEachTenantLocale({
            table: this.table,
            logger,
            callback: async ({ tenantId, localeCode }) => {
                logger.info(`Checking form revisions for ${tenantId} - ${localeCode}.`);

                const formRevision = await queryOne<FbForm>({
                    entity: this.formEntity,
                    partitionKey: `T#${tenantId}#L#${localeCode}#FB#F`
                });

                if (!formRevision) {
                    logger.info(
                        `No form revisions found for ${tenantId} - ${localeCode}: skipping migration.`
                    );
                    shouldExecute = false;
                    return true;
                }

                const [formId, revisionId] = formRevision.id.split("#");

                const cmsRevision = await queryOne<FbForm>({
                    entity: this.cmsEntity,
                    partitionKey: `T#${tenantId}#L#${localeCode}#CMS#CME#CME#${formId}`,
                    options: {
                        eq: `REV#${revisionId}`
                    }
                });

                if (!cmsRevision) {
                    logger.info(
                        `No CMS entries revisions found for ${tenantId} - ${localeCode}: executing migration.`
                    );
                    shouldExecute = true;
                    return false;
                }

                // Continue to the next locale.
                logger.info(
                    `Form revisions already migrated for ${tenantId} - ${localeCode}: skipping migration.`
                );
                return true;
            }
        });

        return shouldExecute;
    }

    async execute({ logger }: DataMigrationContext<MigrationCheckpoint>): Promise<void> {
        await forEachTenantLocale({
            table: this.table,
            logger,
            callback: async ({ tenantId, localeCode }) => {
                await ddbQueryAllWithCallback<FbForm>(
                    {
                        entity: this.formEntity,
                        partitionKey: `T#${tenantId}#L#${localeCode}#FB#F`
                    },
                    async forms => {
                        const items: ReturnType<
                            ReturnType<typeof createDdbCmsEntity>["putBatch"]
                        >[] = [];

                        for (const form of forms) {
                            const [formId, revisionId] = form.id.split("#");

                            const entry = createEntryCommonFields(form);

                            const revisionEntry = {
                                PK: `T#${tenantId}#L#${localeCode}#CMS#CME#CME#${formId}`,
                                SK: `REV#${revisionId}`,
                                GSI1_PK: `T#${tenantId}#L#${localeCode}#CMS#CME#M#fbForm#A`,
                                GSI1_SK: `${form.id}`,
                                TYPE: "cms.entry",
                                ...entry
                            };

                            items.push(this.cmsEntity.putBatch(revisionEntry));
                        }

                        const execute = () => {
                            return batchWriteAll({ table: this.cmsEntity.table, items });
                        };

                        // logger.trace("Storing the CMS records...");
                        await executeWithRetry(execute, {
                            onFailedAttempt: error => {
                                logger.error(
                                    `"batchWriteAll" attempt #${error.attemptNumber} failed.`
                                );
                                logger.error(error.message);
                            }
                        });
                    }
                );

                return true;
            }
        });

        logger.info("Updated all form revisions.");
    }
}
