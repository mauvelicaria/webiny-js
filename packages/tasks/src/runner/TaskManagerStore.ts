import {
    ITask,
    ITaskDataInput,
    ITaskLog,
    ITaskLogItemType,
    ITaskManagerStoreInfoLog,
    ITaskManagerStoreSetOutputOptions,
    ITaskResponseDoneResultOutput,
    ITasksContextObject,
    TaskDataStatus
} from "~/types";
import {
    ITaskManagerStore,
    ITaskManagerStoreErrorLog,
    ITaskManagerStoreUpdateTaskInputParam,
    ITaskManagerStoreUpdateTaskParam
} from "./abstractions";
/**
 * Package deep-equal does not have types.
 */
// @ts-expect-error
import deepEqual from "deep-equal";
import { getObjectProperties } from "~/utils/getObjectProperties";

const getInput = <T extends ITaskDataInput = ITaskDataInput>(
    originalInput: T,
    input: ITaskManagerStoreUpdateTaskInputParam<T>
) => {
    if (typeof input === "function") {
        return input(originalInput);
    }
    return {
        ...originalInput,
        ...input
    };
};

export interface TaskManagerStoreContext {
    tasks: Pick<ITasksContextObject, "updateTask" | "updateLog">;
}

export class TaskManagerStore<
    T extends ITaskDataInput = ITaskDataInput,
    O extends ITaskResponseDoneResultOutput = ITaskResponseDoneResultOutput
> implements ITaskManagerStore<T, O>
{
    private readonly context: TaskManagerStoreContext;
    private task: ITask;
    private taskLog: ITaskLog;

    public constructor(context: TaskManagerStoreContext, task: ITask, log: ITaskLog) {
        this.context = context;
        this.task = task;
        this.taskLog = log;
    }

    public getStatus(): TaskDataStatus {
        return this.task.taskStatus;
    }

    public setTask(task: ITask): void {
        this.task = task;
    }

    public getTask(): ITask<T, O> {
        return this.task as ITask<T, O>;
    }

    public async updateTask(param: ITaskManagerStoreUpdateTaskParam): Promise<void> {
        const data = typeof param === "function" ? param(this.task) : param;
        /**
         * No need to update if nothing changed.
         */
        if (deepEqual(data, this.task)) {
            return;
        }
        this.task = await this.context.tasks.updateTask(this.task.id, {
            ...data,
            output: data.output || this.task.output
        });
    }

    public async updateInput<T extends ITaskDataInput = ITaskDataInput>(
        param: ITaskManagerStoreUpdateTaskInputParam<T>
    ): Promise<void> {
        const input = getInput<T>(this.task.input, param);

        /**
         * No need to update if nothing changed.
         */
        if (deepEqual(input, this.task.input)) {
            return;
        }
        this.task = await this.context.tasks.updateTask(this.task.id, {
            input
        });
    }

    public getInput<T extends ITaskDataInput = ITaskDataInput>(): T {
        return this.task.input as T;
    }

    public async updateOutput(
        values: Partial<O>,
        options: ITaskManagerStoreSetOutputOptions = {}
    ): Promise<void> {
        const output = {
            ...this.task.output,
            ...values
        };
        if (options.save === false) {
            this.task.output = output;
            return;
        }
        await this.context.tasks.updateTask(this.task.id, {
            output
        });
    }

    public getOutput(): O {
        return this.task.output as O;
    }
    /**
     * Currently the methods throws an error if something goes wrong during the database update.
     * TODO: Maybe we should wrap it into try/catch and return error if any?
     */
    public async addInfoLog(log: ITaskManagerStoreInfoLog): Promise<void> {
        this.taskLog = await this.context.tasks.updateLog(this.taskLog.id, {
            items: this.taskLog.items.concat([
                {
                    message: log.message,
                    data: log.data,
                    type: ITaskLogItemType.INFO,
                    createdOn: new Date().toISOString()
                }
            ])
        });
    }
    /**
     * Currently the methods throws an error if something goes wrong during the database update.
     * TODO: Maybe we should wrap it into try/catch and return error if any?
     */
    public async addErrorLog(log: ITaskManagerStoreErrorLog): Promise<void> {
        this.taskLog = await this.context.tasks.updateLog(this.taskLog.id, {
            items: this.taskLog.items.concat([
                {
                    message: log.message,
                    error: log.error instanceof Error ? getObjectProperties(log.error) : log.error,
                    type: ITaskLogItemType.ERROR,
                    createdOn: new Date().toISOString()
                }
            ])
        });
    }
}
