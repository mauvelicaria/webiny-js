import React from "react";
import get from "lodash/get";
import { i18n } from "@webiny/app/i18n";
import { CmsEditorContentEntry, CmsModelField, CmsEditorFieldRendererPlugin } from "~/types";
import { BindComponentRenderProp } from "@webiny/form";
import { LexicalCmsEditor } from "~/admin/components/LexicalCmsEditor/LexicalCmsEditor";

const t = i18n.ns("app-headless-cms/admin/fields/rich-text");

const getKey = (
    field: CmsModelField,
    bind: BindComponentRenderProp<string, CmsEditorContentEntry>
): string => {
    const formId = bind.form.data.id || "new";
    return `${formId}.${field.fieldId}`;
};

const plugin: CmsEditorFieldRendererPlugin = {
    type: "cms-editor-field-renderer",
    name: "cms-editor-field-renderer-lexical",
    isDisabled() {
        // Lexical RTE is default editor in use. This plugin is always enabled by default.
        return false;
    },
    renderer: {
        rendererName: "lexical-text-input",
        name: t`Lexical Text Input`,
        description: t`Renders a lexical text editor.`,
        isDisabled(field) {
            const fieldModelIsUsed = !!field?.id;
            const isLegacyRichTextInput = field.renderer.name === "rich-text-input";

            // Lexical is disabled only if legacy RTE is used.
            if (isLegacyRichTextInput && fieldModelIsUsed) {
                return true;
            }

            // if legacy rich text editor is used, lexical input is disabled.
            return false;
        },
        canUse({ field }) {
            return (
                field.type === "rich-text" &&
                !field.multipleValues &&
                !get(field, "predefinedValues.enabled")
            );
        },
        render({ field, getBind }) {
            const Bind = getBind();
            return (
                <Bind>
                    {bind => {
                        return (
                            <LexicalCmsEditor
                                value={bind.value}
                                onChange={bind.onChange}
                                key={getKey(field, bind as any)}
                                placeholder={field.placeholderText}
                                data-testid={`fr.input.lexical.${field.label}`}
                            />
                        );
                    }}
                </Bind>
            );
        }
    }
};

export default plugin;
