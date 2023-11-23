import { Entity, Table } from "dynamodb-toolbox";
import { PluginsContainer } from "@webiny/plugins";
import { FormBuilderFormCreatePartitionKeyParams, FormBuilderFormStorageOperations } from "~/types";
export interface CreateFormStorageOperationsParams {
    entity: Entity<any>;
    table: Table<string, string, string>;
    plugins: PluginsContainer;
}

export const createFormStorageOperations = (): FormBuilderFormStorageOperations => {
    const createFormPartitionKey = (params: FormBuilderFormCreatePartitionKeyParams): string => {
        const { tenant, locale } = params;

        return `T#${tenant}#L#${locale}#FB#F`;
    };

    const createForm = () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const createFormFrom = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const updateForm = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const getForm = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const listForms = () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const listFormRevisions = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const deleteForm = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const deleteFormRevision = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const publishForm = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    const unpublishForm = async () => {
        throw new Error(
            "api-form-builder-so-ddb does not implement the Form Builder storage operations."
        );
    };

    return {
        createForm,
        createFormFrom,
        updateForm,
        listForms,
        listFormRevisions,
        getForm,
        deleteForm,
        deleteFormRevision,
        publishForm,
        unpublishForm,
        createFormPartitionKey
    };
};
