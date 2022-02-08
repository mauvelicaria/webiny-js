import get from "lodash/get";
import { createTopic } from "@webiny/pubsub";
import {
    AdvancedPublishingWorkflow,
    ApwContentReview,
    ApwContentReviewCrud,
    ApwContentReviewStatus,
    ApwContentReviewStepStatus,
    ApwContentTypes,
    ApwReviewerCrud,
    ApwWorkflowStepTypes,
    CreateApwParams,
    OnAfterContentReviewCreateTopicParams,
    OnAfterContentReviewDeleteTopicParams,
    OnAfterContentReviewUpdateTopicParams,
    OnBeforeContentReviewCreateTopicParams,
    OnBeforeContentReviewDeleteTopicParams,
    OnBeforeContentReviewUpdateTopicParams
} from "~/types";
import { getNextStepStatus, hasReviewer } from "~/plugins/utils";
import {
    NoSignOffProvidedError,
    NotAuthorizedError,
    PendingChangeRequestsError,
    StepInActiveError,
    StepMissingError
} from "~/utils/errors";

interface CreateContentReviewMethodsParams extends CreateApwParams {
    getReviewer: ApwReviewerCrud["get"];
    getContentGetter: AdvancedPublishingWorkflow["getContentGetter"];
}

export function createContentReviewMethods({
    getIdentity,
    storageOperations,
    getReviewer,
    getContentGetter
}: CreateContentReviewMethodsParams): ApwContentReviewCrud {
    const onBeforeContentReviewCreate = createTopic<OnBeforeContentReviewCreateTopicParams>();
    const onAfterContentReviewCreate = createTopic<OnAfterContentReviewCreateTopicParams>();
    const onBeforeContentReviewUpdate = createTopic<OnBeforeContentReviewUpdateTopicParams>();
    const onAfterContentReviewUpdate = createTopic<OnAfterContentReviewUpdateTopicParams>();
    const onBeforeContentReviewDelete = createTopic<OnBeforeContentReviewDeleteTopicParams>();
    const onAfterContentReviewDelete = createTopic<OnAfterContentReviewDeleteTopicParams>();
    return {
        /**
         * Lifecycle events
         */
        onBeforeContentReviewCreate,
        onAfterContentReviewCreate,
        onBeforeContentReviewUpdate,
        onAfterContentReviewUpdate,
        onBeforeContentReviewDelete,
        onAfterContentReviewDelete,
        async get(id) {
            return storageOperations.getContentReview({ id });
        },
        async list(params) {
            return storageOperations.listContentReviews(params);
        },
        async create(data) {
            const input = {
                ...data,
                status: ApwContentReviewStatus.UNDER_REVIEW
            };
            await onBeforeContentReviewCreate.publish({ input });

            const contentReview = await storageOperations.createContentReview({
                data: input
            });

            await onAfterContentReviewCreate.publish({ contentReview });

            return contentReview;
        },
        async update(id, data) {
            const original = await storageOperations.getContentReview({ id });

            await onBeforeContentReviewUpdate.publish({ original, input: { id, data } });

            const contentReview = await storageOperations.updateContentReview({
                id,
                data
            });

            await onAfterContentReviewUpdate.publish({
                original,
                input: { id, data },
                contentReview
            });

            return contentReview;
        },
        async delete(id) {
            const contentReview = await storageOperations.getContentReview({ id });

            await onBeforeContentReviewDelete.publish({ contentReview });

            await storageOperations.deleteContentReview({ id });

            await onAfterContentReviewDelete.publish({ contentReview });

            return true;
        },
        async provideSignOff(id, stepId) {
            const entry: ApwContentReview = await this.get(id);
            const { steps } = entry;
            const stepIndex = steps.findIndex(step => step.id === stepId);
            const currentStep = steps[stepIndex];
            const previousStep = steps[stepIndex - 1];

            const identity = getIdentity();
            const hasPermission = await hasReviewer({
                getReviewer,
                identity,
                step: currentStep
            });

            /**
             *  Check whether the sign-off is requested by a reviewer.
             */
            if (!hasPermission) {
                throw new NotAuthorizedError({ entry, input: { id, step: stepId } });
            }
            /**
             *  Don't allow sign off, if previous step is of "mandatory_blocking" type and undone.
             */
            if (
                previousStep &&
                previousStep.status !== ApwContentReviewStepStatus.DONE &&
                previousStep.type === ApwWorkflowStepTypes.MANDATORY_BLOCKING
            ) {
                throw new StepMissingError({ entry, input: { id, step: stepId } });
            }
            /**
             *  Don't allow sign off, if there are pending change requests.
             */
            if (currentStep.pendingChangeRequests > 0) {
                throw new PendingChangeRequestsError({ entry, input: { id, step: stepId } });
            }
            /**
             *  Don't allow sign off, if current step is not in "active" state.
             */
            if (currentStep.status !== ApwContentReviewStepStatus.ACTIVE) {
                throw new StepInActiveError({ entry, input: { id, step: stepId } });
            }
            let previousStepStatus;
            /*
             * Provide sign-off for give step.
             */
            const updatedSteps = steps.map((step, index) => {
                if (index === stepIndex) {
                    previousStepStatus = ApwContentReviewStepStatus.DONE;
                    return {
                        ...step,
                        status: ApwContentReviewStepStatus.DONE,
                        signOffProvidedOn: new Date().toISOString(),
                        signOffProvidedBy: identity
                    };
                }
                /**
                 * Update next steps status based on type.
                 */
                if (index > stepIndex) {
                    const previousStep = steps[index - 1];

                    previousStepStatus = getNextStepStatus(previousStep.type, previousStepStatus);
                    return {
                        ...step,
                        status: previousStepStatus
                    };
                }

                return step;
            });
            /**
             * Save updated steps.
             */
            await this.update(id, {
                steps: updatedSteps
            });
            return true;
        },
        async retractSignOff(id, stepId) {
            const entry: ApwContentReview = await this.get(id);
            const { steps } = entry;
            const stepIndex = steps.findIndex(step => step.id === stepId);
            const currentStep = steps[stepIndex];

            const identity = getIdentity();

            const hasPermission = await hasReviewer({
                getReviewer,
                identity,
                step: currentStep
            });

            /**
             *  Check whether the retract sign-off is requested by a reviewer.
             */
            if (!hasPermission) {
                throw new NotAuthorizedError({ entry, input: { id, step: stepId } });
            }
            /**
             *  Don't allow, if step in not "done" i.e. no sign-off was provided for it.
             */
            if (currentStep.status !== ApwContentReviewStepStatus.DONE) {
                throw new NoSignOffProvidedError({ entry, input: { id, step: stepId } });
            }
            let previousStepStatus;

            /*
             * Retract sign-off for give step.
             */
            const updatedSteps = steps.map((step, index) => {
                if (index === stepIndex) {
                    previousStepStatus = ApwContentReviewStepStatus.ACTIVE;
                    return {
                        ...step,
                        status: previousStepStatus,
                        signOffProvidedOn: null,
                        signOffProvidedBy: null
                    };
                }
                /**
                 * Set next step status as "inactive".
                 */
                if (index > stepIndex) {
                    const previousStep = steps[index - 1];

                    previousStepStatus = getNextStepStatus(previousStep.type, previousStepStatus);

                    return {
                        ...step,
                        status: previousStepStatus
                    };
                }

                return step;
            });

            await this.update(id, {
                steps: updatedSteps
            });
            return true;
        },
        async isReviewRequired(data) {
            const contentGetter = getContentGetter(data.type);
            const content = await contentGetter(data.id, data.settings);

            let isReviewRequired = false;
            let contentReviewId = null;

            if (data.type === ApwContentTypes.PAGE) {
                contentReviewId = get(content, "settings.apw.contentReviewId");

                const workflowId = get(content, "settings.apw.workflowId");

                if (workflowId) {
                    isReviewRequired = true;
                }
            }
            return {
                isReviewRequired,
                contentReviewId
            };
        }
    };
}
