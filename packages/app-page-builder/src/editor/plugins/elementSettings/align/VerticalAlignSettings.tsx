import React, { useMemo } from "react";
import { css } from "emotion";
import { useRecoilValue } from "recoil";
import classNames from "classnames";
import get from "lodash/get";
import set from "lodash/set";
import merge from "lodash/merge";
import { plugins } from "@webiny/plugins";
import { Tooltip } from "@webiny/ui/Tooltip";
import { IconButton } from "@webiny/ui/Button";
import {
    PbEditorPageElementPlugin,
    PbEditorElement,
    PbEditorPageElementSettingsRenderComponentProps,
    PbEditorResponsiveModePlugin
} from "~/types";
import { useEventActionHandler } from "../../../hooks/useEventActionHandler";
import { UpdateElementActionEvent } from "../../../recoil/actions";
import {
    activeElementAtom,
    uiAtom,
    elementWithChildrenByIdSelector
} from "../../../recoil/modules";
import { applyFallbackDisplayMode } from "../elementSettingsUtils";
// Components
import { ContentWrapper } from "../components/StyledComponents";
import Accordion from "../components/Accordion";
// Icons
import { ReactComponent as AlignTopIcon } from "./icons/align_vertical_top.svg";
import { ReactComponent as AlignCenterIcon } from "./icons/align_vertical_center.svg";
import { ReactComponent as AlignBottomIcon } from "./icons/align_vertical_bottom.svg";
import { ReactComponent as AlignStretchIcon } from "./icons/height_black.svg";

const classes = {
    activeIcon: css({
        "&.mdc-icon-button": {
            color: "var(--mdc-theme-primary)"
        }
    }),
    icon: css({
        "&.mdc-icon-button": {
            color: "var(--mdc-theme-text-primary-on-background)"
        }
    })
};

type IconsType = {
    [key: string]: React.ReactElement;
};

enum AlignTypesEnum {
    start = "flex-start",
    center = "center",
    end = "flex-end",
    stretch = "stretch"
}

// Icons map for dynamic render
const icons: IconsType = {
    [AlignTypesEnum.start]: <AlignTopIcon />,
    [AlignTypesEnum.center]: <AlignCenterIcon />,
    [AlignTypesEnum.end]: <AlignBottomIcon />,
    [AlignTypesEnum.stretch]: <AlignStretchIcon />
};
const alignments = Object.keys(icons);

const iconDescriptions = {
    [AlignTypesEnum.start]: "Align top",
    [AlignTypesEnum.center]: "Align center",
    [AlignTypesEnum.end]: "Align bottom",
    [AlignTypesEnum.stretch]: "Stretch"
};

const DATA_NAMESPACE = "data.settings.verticalAlign";

const VerticalAlignSettings: React.FunctionComponent<PbEditorPageElementSettingsRenderComponentProps> =
    ({ defaultAccordionValue }) => {
        const { displayMode } = useRecoilValue(uiAtom);
        const propName = `${DATA_NAMESPACE}.${displayMode}`;
        const handler = useEventActionHandler();
        const activeElementId = useRecoilValue(activeElementAtom);
        const element = useRecoilValue(elementWithChildrenByIdSelector(activeElementId));
        const fallbackValue = useMemo(
            () =>
                applyFallbackDisplayMode(displayMode, mode =>
                    get(element, `${DATA_NAMESPACE}.${mode}`)
                ),
            [displayMode]
        );
        const align = get(element, propName, fallbackValue || AlignTypesEnum.center);

        const { config: activeEditorModeConfig } = useMemo(() => {
            return plugins
                .byType<PbEditorResponsiveModePlugin>("pb-editor-responsive-mode")
                .find(pl => pl.config.displayMode === displayMode);
        }, [displayMode]);

        const updateElement = (element: PbEditorElement) => {
            handler.trigger(
                new UpdateElementActionEvent({
                    element,
                    history: true
                })
            );
        };

        const onClick = (type: AlignTypesEnum) => {
            const newElement = merge({}, element, set({}, propName, type));
            updateElement(newElement);
        };

        const plugin = plugins
            .byType<PbEditorPageElementPlugin>("pb-editor-page-element")
            .find(pl => pl.elementType === element.type);

        if (!plugin) {
            return null;
        }

        return (
            <Accordion
                title={"Vertical align"}
                defaultValue={defaultAccordionValue}
                icon={
                    <Tooltip
                        content={`Changes will apply for ${activeEditorModeConfig.displayMode}`}
                    >
                        {activeEditorModeConfig.icon}
                    </Tooltip>
                }
            >
                <ContentWrapper>
                    {alignments.map(type => (
                        <Tooltip key={type} content={iconDescriptions[type]} placement={"top"}>
                            <IconButton
                                className={classNames({
                                    [classes.activeIcon]: align === type,
                                    [classes.icon]: align !== type
                                })}
                                icon={icons[type]}
                                onClick={() => onClick(type as AlignTypesEnum)}
                            />
                        </Tooltip>
                    ))}
                </ContentWrapper>
            </Accordion>
        );
    };

export default React.memo(VerticalAlignSettings);
