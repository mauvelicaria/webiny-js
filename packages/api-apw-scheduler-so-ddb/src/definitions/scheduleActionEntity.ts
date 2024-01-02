import { Entity, Table } from "@webiny/db-dynamodb/toolbox";
import { Attributes } from "~/types";

interface Params {
    entityName: string;
    table: Table<string, string, string>;
    attributes?: Attributes;
}

export const createScheduleActionsEntity = ({ entityName, table, attributes }: Params) => {
    return new Entity({
        name: entityName,
        table,
        attributes: {
            PK: {
                partitionKey: true
            },
            SK: {
                sortKey: true
            },
            GSI1_PK: {
                type: "string"
            },
            GSI1_SK: {
                type: "string"
            },
            TYPE: {
                type: "string"
            },
            id: {
                type: "string"
            },
            data: {
                type: "map"
            },
            error: {
                type: "map"
            },
            createdOn: {
                type: "string"
            },
            modifiedOn: {
                type: "string"
            },
            savedOn: {
                type: "string"
            },
            createdBy: {
                type: "map"
            },
            modifiedBy: {
                type: "map"
            },
            savedBy: {
                type: "map"
            },
            tenant: {
                type: "string"
            },
            locale: {
                type: "string"
            },
            ...attributes
        }
    });
};
