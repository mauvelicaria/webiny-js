import * as pulumi from "@pulumi/pulumi";
import { StepFunctionDefinition, StepFunctionDefinitionStatesType } from "./types";

export interface BackgroundTaskParams {
    lambdaFunctionName: string;
    lambdaFunctionArn: pulumi.Input<string>;
}

export const createBackgroundTaskDefinition = (
    params: BackgroundTaskParams
): StepFunctionDefinition => {
    const { lambdaFunctionName, lambdaFunctionArn } = params;
    return {
        Comment: "Background tasks",
        StartAt: "TransformEvent",
        States: {
            /**
             * Transform the EventBridge event to a format that will be used in the Lambda function.
             */
            TransformEvent: {
                Type: StepFunctionDefinitionStatesType.Pass,
                Next: "Run",
                Parameters: {
                    "webinyTaskId.$": "$.detail.webinyTaskId",
                    "tenant.$": "$.detail.tenant",
                    "locale.$": "$.detail.locale"
                }
            },
            /**
             * Run the task and wait for the response from lambda.
             * On some fatal error go to Error step.
             * In other cases, check the status of the task.
             */
            Run: {
                Type: StepFunctionDefinitionStatesType.Task,
                Resource: lambdaFunctionArn,
                Next: "CheckStatus",
                ResultPath: "$",
                InputPath: "$",
                /**
                 * Parameters will be received as an event in the lambda function.
                 * Task Handler determines that it can run a task based on the Payload.webinyTaskId parameter - it must be set!
                 */
                Parameters: {
                    name: lambdaFunctionName,
                    payload: {
                        "webinyTaskId.$": "$.webinyTaskId",
                        "locale.$": "$.locale",
                        "tenant.$": "$.tenant",
                        endpoint: "manage",
                        "stateMachineId.$": "$$.StateMachine.Id"
                    }
                },
                Catch: [
                    {
                        ErrorEquals: ["States.ALL"],
                        Next: "UnknownTaskError"
                    }
                ]
            },
            /**
             * On CONTINUE, go back to Run.
             * On ERROR, go to Error step.
             * On DONE, go to Done step.
             */
            CheckStatus: {
                Type: StepFunctionDefinitionStatesType.Choice,
                InputPath: "$",
                Choices: [
                    /**
                     * There is a possibility that the task will return a CONTINUE status and a waitUntil value.
                     * This means that task will wait for the specified time and then continue.
                     * It can be used to handle waiting for child tasks or some resource to be created.
                     */
                    {
                        And: [
                            {
                                Variable: "$.status",
                                StringEquals: "continue"
                            },
                            {
                                Variable: "$.waitUntil",
                                IsPresent: true
                            },
                            {
                                Variable: "$.waitUntil",
                                IsTimestamp: true
                            }
                        ],
                        Next: "Waiter"
                    },
                    /**
                     * When no waitUntil value is present, go to Run.
                     */
                    {
                        Variable: "$.status",
                        StringEquals: "continue",
                        Next: "Run"
                    },
                    {
                        Variable: "$.status",
                        StringEquals: "error",
                        Next: "Error"
                    },
                    {
                        Variable: "$.status",
                        StringEquals: "done",
                        Next: "Done"
                    },
                    {
                        Variable: "$.status",
                        StringEquals: "stopped",
                        Next: "Stopped"
                    }
                ],
                Default: "UnknownStatus"
            },
            Waiter: {
                Type: StepFunctionDefinitionStatesType.Wait,
                TimestampPath: "$.waitUntil",
                Next: "Run"
            },
            UnknownTaskError: {
                Type: StepFunctionDefinitionStatesType.Fail,
                Cause: "Fatal error - unknown task error."
            },
            /**
             * Unknown task status on Choice step.
             */
            UnknownStatus: {
                Type: StepFunctionDefinitionStatesType.Fail,
                Cause: "Fatal error - unknown status."
            },
            /**
             * Fail the task and output the error.
             */
            Error: {
                Type: StepFunctionDefinitionStatesType.Fail,
                CausePath: "States.JsonToString($.error)",
                ErrorPath: "$.error.code"
            },
            /**
             * Complete the task.
             */
            Done: {
                Type: StepFunctionDefinitionStatesType.Succeed
            },
            Stopped: {
                Type: StepFunctionDefinitionStatesType.Succeed
            }
        }
    };
};
