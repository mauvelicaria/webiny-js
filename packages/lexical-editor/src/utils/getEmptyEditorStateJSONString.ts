import { EditorStateJSONString } from "~/types";

/**
 * @description Basic JSON data string that will initialize the editor.
 */
export const getEmptyEditorStateJSONString = (): EditorStateJSONString => {
    return JSON.stringify({
        root: {
            children: [
                {
                    children: [],
                    direction: null,
                    format: "",
                    indent: 0,
                    type: "paragraph",
                    version: 1
                }
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "root",
            version: 1
        }
    });
};
